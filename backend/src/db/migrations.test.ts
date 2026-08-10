import { beforeEach, describe, expect, it } from "vitest";
import { type Client, createDbClient } from "./client.js";
import { type Migration, migrateDown, migrateUp } from "./migrations.js";

const fixedNow = () => new Date("2026-07-23T10:00:00.000Z");

function testMigrations(): Migration[] {
	return [
		{
			id: 1,
			name: "crea-nota",
			up: async (db) => {
				await db.execute(
					"CREATE TABLE nota (id INTEGER PRIMARY KEY, texto TEXT)",
				);
			},
			down: async (db) => {
				await db.execute("DROP TABLE nota");
			},
		},
		{
			id: 2,
			name: "añade-columna-color",
			up: async (db) => {
				await db.execute("ALTER TABLE nota ADD COLUMN color TEXT");
			},
			down: async (db) => {
				await db.execute("ALTER TABLE nota DROP COLUMN color");
			},
		},
	];
}

async function tableColumns(db: Client, table: string): Promise<string[]> {
	const result = await db.execute(`PRAGMA table_info(${table})`);
	return result.rows.map((row) => String(row["name"]));
}

describe("migrateUp / migrateDown", () => {
	let db: Client;

	beforeEach(async () => {
		db = await createDbClient(":memory:");
	});

	it("aplica las migraciones pendientes en orden y las registra", async () => {
		const applied = await migrateUp(db, testMigrations(), { now: fixedNow });

		expect(applied).toEqual(["crea-nota", "añade-columna-color"]);
		expect(await tableColumns(db, "nota")).toContain("color");

		const rows = (await db.execute("SELECT * FROM schema_migrations")).rows;
		expect(rows).toHaveLength(2);
		expect(rows[0]?.["applied_at"]).toBe("2026-07-23T10:00:00.000Z");
	});

	it("es idempotente: una segunda pasada no aplica nada", async () => {
		const migrations = testMigrations();
		await migrateUp(db, migrations, { now: fixedNow });

		const second = await migrateUp(db, migrations, { now: fixedNow });

		expect(second).toEqual([]);
	});

	it("revierte la última migración con down y permite reaplicarla", async () => {
		const migrations = testMigrations();
		await migrateUp(db, migrations, { now: fixedNow });

		const reverted = await migrateDown(db, migrations);

		expect(reverted).toEqual(["añade-columna-color"]);
		expect(await tableColumns(db, "nota")).not.toContain("color");

		const reapplied = await migrateUp(db, migrations, { now: fixedNow });
		expect(reapplied).toEqual(["añade-columna-color"]);
	});

	it("revierte varias con steps y no falla si no queda nada", async () => {
		const migrations = testMigrations();
		await migrateUp(db, migrations, { now: fixedNow });

		expect(await migrateDown(db, migrations, 5)).toEqual([
			"añade-columna-color",
			"crea-nota",
		]);
		expect(await migrateDown(db, migrations)).toEqual([]);
	});

	it("tolera que otra instancia gane la carrera (arranques concurrentes)", async () => {
		// Serverless: cada instancia migra al bootear. Simulamos que la nuestra
		// falla porque otra ya creó la tabla y registró la migración.
		const [first] = testMigrations();
		if (!first) throw new Error("fixture roto");
		const carrera = {
			...first,
			up: async (client: typeof db) => {
				await first.up(client);
				await client.execute({
					sql: "INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)",
					args: [first.id, first.name, "2026-08-09T00:00:00.000Z"],
				});
				throw new Error("table already exists");
			},
		};

		// No lanza: al releer, la migración consta como aplicada.
		await expect(migrateUp(db, [carrera])).resolves.toEqual([]);
	});

	it("un fallo real de migración sí sube", async () => {
		const [first] = testMigrations();
		if (!first) throw new Error("fixture roto");
		const rota = {
			...first,
			up: async () => {
				throw new Error("SQL inválido");
			},
		};

		await expect(migrateUp(db, [rota])).rejects.toThrow(/SQL inválido/);
	});

	it("rechaza listas con ids duplicados o desordenados", async () => {
		const [first, second] = testMigrations();
		if (!first || !second) throw new Error("fixture roto");

		await expect(migrateUp(db, [first, { ...second, id: 1 }])).rejects.toThrow(
			/duplicada/,
		);
		await expect(migrateUp(db, [second, first])).rejects.toThrow(
			/desordenadas/,
		);
	});
});
