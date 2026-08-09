import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";

/**
 * Vista "TODOS LOS PROYECTOS": mismas reglas de ventana y prioridad, pero el
 * conjunto de entrada es el trabajo entero, no el de un proyecto.
 */
describe("GET /items y GET /kanban (todos los proyectos)", () => {
	let app: FastifyInstance;
	let ganttero: number;
	let otro: number;
	let clock: Date;

	beforeEach(async () => {
		clock = new Date("2026-07-23T10:00:00.000Z");
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: () => clock });
		app = buildApp({ db, now: () => clock });
		ganttero = (
			await app.inject({
				method: "POST",
				url: "/projects",
				payload: { name: "Ganttero", key_prefix: "GP" },
			})
		).json().id;
		otro = (
			await app.inject({
				method: "POST",
				url: "/projects",
				payload: { name: "Otro", key_prefix: "OT" },
			})
		).json().id;
	});

	async function createTask(
		projectId: number,
		payload: Record<string, unknown>,
	) {
		const response = await app.inject({
			method: "POST",
			url: "/items",
			payload: { project_id: projectId, type: "task", ...payload },
		});
		return response.json();
	}

	it("GET /items devuelve el trabajo de todos los proyectos, con su clave", async () => {
		await createTask(ganttero, { title: "de ganttero" });
		await createTask(otro, { title: "del otro" });

		const response = await app.inject({ method: "GET", url: "/items" });
		expect(response.statusCode).toBe(200);
		const items = response.json();
		expect(items).toHaveLength(2);
		expect(items.map((item: { key: string }) => item.key).sort()).toEqual([
			"GP-1",
			"OT-1",
		]);
	});

	it("GET /items no se mezcla con el listado por proyecto", async () => {
		await createTask(ganttero, { title: "de ganttero" });
		await createTask(otro, { title: "del otro" });

		const perProject = await app.inject({
			method: "GET",
			url: `/projects/${ganttero}/items`,
		});
		expect(perProject.json()).toHaveLength(1);
	});

	it("GET /kanban deriva un tablero con las tarjetas de todos los proyectos", async () => {
		await createTask(ganttero, {
			title: "en ventana de ganttero",
			start_date: "2026-07-24",
			end_date: "2026-07-28",
		});
		await createTask(otro, {
			title: "en ventana del otro",
			start_date: "2026-07-25",
			end_date: "2026-07-26",
		});
		await createTask(otro, {
			title: "fuera de ventana",
			start_date: "2026-12-01",
			end_date: "2026-12-03",
		});

		const response = await app.inject({ method: "GET", url: "/kanban" });
		expect(response.statusCode).toBe(200);
		const board = response.json();
		expect(board.project_id).toBeNull();
		expect(board.today).toBe("2026-07-23");
		expect(
			board.columns.backlog.map((card: { title: string }) => card.title),
		).toEqual(["en ventana de ganttero", "en ventana del otro"]);
	});

	it("aplica las mismas reglas de ventana y prioridad que el tablero por proyecto", async () => {
		await createTask(otro, {
			title: "vencida",
			start_date: "2026-07-01",
			end_date: "2026-07-10",
		});

		const board = (await app.inject({ method: "GET", url: "/kanban" })).json();
		expect(board.columns.backlog[0].priority).toBe("late");
		expect(board.window_days).toBe(14);
	});

	it("sin ningún ítem devuelve las cuatro columnas vacías", async () => {
		const board = (await app.inject({ method: "GET", url: "/kanban" })).json();
		expect(board.columns).toEqual({
			backlog: [],
			in_progress: [],
			blocked: [],
			done: [],
		});
	});
});
