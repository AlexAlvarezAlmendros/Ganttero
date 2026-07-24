import { beforeEach, describe, expect, it } from "vitest";
import { type Client, createDbClient } from "../client.js";
import { migrateDown, migrateUp } from "../migrations.js";
import { migrations } from "./index.js";

const fixedNow = () => new Date("2026-07-23T10:00:00.000Z");

async function tableNames(db: Client): Promise<string[]> {
	const result = await db.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
	);
	return result.rows.map((row) => String(row["name"]));
}

async function seedProjectAndItem(db: Client): Promise<void> {
	await db.execute({
		sql: "INSERT INTO project (id, name, key_prefix, created_at) VALUES (1, 'Ganttero', 'GP', ?)",
		args: [fixedNow().toISOString()],
	});
	await db.execute({
		sql: `INSERT INTO item (id, project_id, type, key_number, title, created_at, updated_at)
			VALUES (1, 1, 'task', 1, 'Primera tarea', ?, ?)`,
		args: [fixedNow().toISOString(), fixedNow().toISOString()],
	});
}

describe("migración 001-modelo-inicial", () => {
	let db: Client;

	beforeEach(async () => {
		db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
	});

	it("crea todas las tablas del modelo y la fila única de settings", async () => {
		expect(await tableNames(db)).toEqual([
			"dependency",
			"github_link",
			"item",
			"item_commit",
			"project",
			"schema_migrations",
			"settings",
			"time_log",
		]);

		const settings = (await db.execute("SELECT * FROM settings")).rows;
		expect(settings).toHaveLength(1);
		expect(settings[0]?.["kanban_window_days"]).toBe(14);
	});

	it("borra en cascada items, time_logs y dependencias al borrar el proyecto", async () => {
		await seedProjectAndItem(db);
		await db.execute({
			sql: "INSERT INTO time_log (item_id, started_at) VALUES (1, ?)",
			args: [fixedNow().toISOString()],
		});

		await db.execute("DELETE FROM project WHERE id = 1");

		expect((await db.execute("SELECT * FROM item")).rows).toHaveLength(0);
		expect((await db.execute("SELECT * FROM time_log")).rows).toHaveLength(0);
	});

	it("rechaza status y type fuera del dominio", async () => {
		await seedProjectAndItem(db);

		await expect(
			db.execute("UPDATE item SET status = 'doing' WHERE id = 1"),
		).rejects.toThrow(/CHECK/);
		await expect(
			db.execute(`INSERT INTO item (project_id, type, key_number, title, created_at, updated_at)
				VALUES (1, 'milestone', 2, 'x', '2026-07-23T10:00:00.000Z', '2026-07-23T10:00:00.000Z')`),
		).rejects.toThrow(/CHECK/);
	});

	it("rechaza end_date anterior a start_date y estimaciones no positivas", async () => {
		await seedProjectAndItem(db);

		await expect(
			db.execute(
				"UPDATE item SET start_date = '2026-07-29', end_date = '2026-07-27' WHERE id = 1",
			),
		).rejects.toThrow(/CHECK/);
		await expect(
			db.execute("UPDATE item SET estimate_min = 0 WHERE id = 1"),
		).rejects.toThrow(/CHECK/);
	});

	it("exige key_number único por proyecto y una sola fila de settings", async () => {
		await seedProjectAndItem(db);

		await expect(
			db.execute(`INSERT INTO item (project_id, type, key_number, title, created_at, updated_at)
				VALUES (1, 'task', 1, 'clave repetida', '2026-07-23T10:00:00.000Z', '2026-07-23T10:00:00.000Z')`),
		).rejects.toThrow(/UNIQUE/);
		await expect(
			db.execute("INSERT INTO settings (id) VALUES (2)"),
		).rejects.toThrow(/CHECK/);
	});

	it("impide que un ítem dependa de sí mismo", async () => {
		await seedProjectAndItem(db);

		await expect(
			db.execute("INSERT INTO dependency (from_item, to_item) VALUES (1, 1)"),
		).rejects.toThrow(/CHECK/);
	});

	it("down revierte todas las migraciones y permite reaplicar", async () => {
		await migrateDown(db, migrations, migrations.length);

		expect(await tableNames(db)).toEqual(["schema_migrations"]);

		const reapplied = await migrateUp(db, migrations, { now: fixedNow });
		expect(reapplied[0]).toBe("modelo-inicial");
		expect(reapplied).toHaveLength(migrations.length);
	});
});
