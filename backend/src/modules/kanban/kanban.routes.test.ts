import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";

/** El hito de la fase, end-to-end: cambiar una fecha recompone el tablero solo. */
describe("GET /projects/:id/kanban", () => {
	let app: FastifyInstance;
	let projectId: number;
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
		projectId = project.json().id;
	});

	async function createTask(payload: Record<string, unknown>) {
		const response = await app.inject({
			method: "POST",
			url: "/items",
			payload: { project_id: projectId, type: "task", ...payload },
		});
		return response.json();
	}

	async function board() {
		const response = await app.inject({
			method: "GET",
			url: `/projects/${projectId}/kanban`,
		});
		return response.json();
	}

	it("deriva columnas con prioridad y respeta la ventana de settings", async () => {
		await createTask({
			title: "en ventana",
			start_date: "2026-07-24",
			end_date: "2026-07-28",
		});
		await createTask({
			title: "fuera",
			start_date: "2026-09-01",
			end_date: "2026-09-03",
		});
		await createTask({
			title: "vencida",
			start_date: "2026-07-01",
			end_date: "2026-07-10",
		});

		const result = await board();
		expect(result.today).toBe("2026-07-23");
		expect(result.window_days).toBe(14);
		expect(
			result.columns.backlog.map((card: { title: string }) => card.title),
		).toEqual(["vencida", "en ventana"]);
		expect(result.columns.backlog[0].priority).toBe("late");
	});

	it("HITO: mover la fecha en el Gantt mete/saca la tarjeta sin tocar nada más", async () => {
		const far = await createTask({
			title: "lejana",
			start_date: "2026-09-01",
			end_date: "2026-09-03",
		});
		expect((await board()).columns.backlog).toHaveLength(0);

		await app.inject({
			method: "PATCH",
			url: `/items/${far.id}`,
			payload: { start_date: "2026-07-24", end_date: "2026-07-26" },
		});

		const after = await board();
		expect(after.columns.backlog).toHaveLength(1);
		expect(after.columns.backlog[0].priority).toBe("now");
	});

	it("recalcula al cambiar el día sin ningún job (derivación por request)", async () => {
		await createTask({
			title: "mañana",
			start_date: "2026-07-24",
			end_date: "2026-07-25",
		});
		expect((await board()).columns.backlog[0].priority).toBe("now");

		clock = new Date("2026-07-26T08:00:00.000Z"); // amanece tres días después
		expect((await board()).columns.backlog[0].priority).toBe("late");
	});

	it("PATCH /settings cambia la ventana y el tablero lo refleja", async () => {
		await createTask({
			title: "a 20 días",
			start_date: "2026-08-12",
			end_date: "2026-08-14",
		});
		expect((await board()).columns.backlog).toHaveLength(0);

		const updated = await app.inject({
			method: "PATCH",
			url: "/settings",
			payload: { kanban_window_days: 30 },
		});
		expect(updated.json().kanban_window_days).toBe(30);
		expect((await board()).columns.backlog).toHaveLength(1);
	});

	it("404 para proyecto inexistente y 400 para ventana fuera de rango", async () => {
		const missing = await app.inject({
			method: "GET",
			url: "/projects/99/kanban",
		});
		expect(missing.statusCode).toBe(404);

		const bad = await app.inject({
			method: "PATCH",
			url: "/settings",
			payload: { kanban_window_days: 0 },
		});
		expect(bad.statusCode).toBe(400);
	});
});
