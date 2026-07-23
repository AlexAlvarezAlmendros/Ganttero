import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";

/** Flujo completo: los PATCH de estado abren/cierran tramos con un reloj mutable. */
describe("cronometraje end-to-end vía /items", () => {
	let app: FastifyInstance;
	let itemId: number;
	let clock: Date;

	beforeEach(async () => {
		clock = new Date("2026-07-23T10:00:00.000Z");
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: () => clock });
		app = buildApp({ db, now: () => clock });

		const project = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});
		const item = await app.inject({
			method: "POST",
			url: "/items",
			payload: { project_id: project.json().id, type: "task", title: "Tarea" },
		});
		itemId = item.json().id;
	});

	async function setStatus(status: string) {
		return app.inject({
			method: "PATCH",
			url: `/items/${itemId}`,
			payload: { status },
		});
	}

	async function summary() {
		const response = await app.inject({
			method: "GET",
			url: `/items/${itemId}/timelogs`,
		});
		return response.json();
	}

	it("in_progress → done cierra el tramo y suma la duración", async () => {
		await setStatus("in_progress");
		clock = new Date("2026-07-23T11:00:00.000Z"); // +1 h trabajando

		await setStatus("done");
		const result = await summary();

		expect(result.total_sec).toBe(3600);
		expect(result.running).toBe(false);
		expect(result.logs).toHaveLength(1);
		expect(result.logs[0].ended_at).toBe("2026-07-23T11:00:00.000Z");
	});

	it("reabrir suma un tramo nuevo y el total es la suma", async () => {
		await setStatus("in_progress");
		clock = new Date("2026-07-23T10:30:00.000Z");
		await setStatus("done");

		clock = new Date("2026-07-23T15:00:00.000Z");
		await setStatus("in_progress"); // reabrir
		clock = new Date("2026-07-23T15:10:00.000Z");
		await setStatus("done");

		const result = await summary();
		expect(result.logs).toHaveLength(2);
		expect(result.total_sec).toBe(1800 + 600);
	});

	it("el tramo abierto cuenta en el total mientras corre", async () => {
		await setStatus("in_progress");
		clock = new Date("2026-07-23T10:05:00.000Z");

		const result = await summary();
		expect(result.running).toBe(true);
		expect(result.total_sec).toBe(300);
	});

	it("backlog → blocked → backlog no genera tramos", async () => {
		await setStatus("blocked");
		await setStatus("backlog");

		const result = await summary();
		expect(result.logs).toHaveLength(0);
	});

	it("404 para un ítem inexistente", async () => {
		const missing = await app.inject({
			method: "GET",
			url: "/items/999/timelogs",
		});
		expect(missing.statusCode).toBe(404);
	});
});
