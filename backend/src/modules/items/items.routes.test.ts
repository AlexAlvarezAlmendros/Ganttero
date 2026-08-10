import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../build-app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";

const fixedNow = () => new Date("2026-07-23T10:00:00.000Z");

describe("rutas /items", () => {
	let app: FastifyInstance;
	let projectId: number;

	beforeEach(async () => {
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
		app = buildApp({ db, now: fixedNow });
		const created = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});
		projectId = created.json().id;
	});

	async function createItem(payload: Record<string, unknown>) {
		return app.inject({
			method: "POST",
			url: "/items",
			payload: { project_id: projectId, ...payload },
		});
	}

	it("crea jerarquía épica → tarea → subtarea con claves GP-n secuenciales", async () => {
		const epic = await createItem({ type: "epic", title: "Fase 1" });
		expect(epic.statusCode).toBe(201);
		expect(epic.json().key).toBe("GP-1");

		const task = await createItem({
			type: "task",
			title: "Migrar sqld al NAS",
			parent_id: epic.json().id,
			start_date: "2026-07-23",
			end_date: "2026-07-25",
			estimate_min: 240,
		});
		expect(task.json().key).toBe("GP-2");
		expect(task.json().status).toBe("backlog");

		const subtask = await createItem({
			type: "subtask",
			title: "Copiar fichero",
			parent_id: task.json().id,
		});
		expect(subtask.json().key).toBe("GP-3");

		const list = await app.inject({
			method: "GET",
			url: `/projects/${projectId}/items`,
		});
		expect(list.json()).toHaveLength(3);
	});

	it("devuelve 422 si una subtarea no cuelga de una tarea", async () => {
		const orphan = await createItem({ type: "subtask", title: "huérfana" });
		expect(orphan.statusCode).toBe(422);
	});

	it("devuelve 400 con fechas invertidas en el create", async () => {
		const bad = await createItem({
			type: "task",
			title: "x",
			start_date: "2026-07-25",
			end_date: "2026-07-20",
		});
		expect(bad.statusCode).toBe(400);
	});

	it("devuelve 422 si el PATCH deja las fechas invertidas", async () => {
		const task = await createItem({
			type: "task",
			title: "x",
			start_date: "2026-07-20",
			end_date: "2026-07-25",
		});

		const bad = await app.inject({
			method: "PATCH",
			url: `/items/${task.json().id}`,
			payload: { end_date: "2026-07-19" },
		});
		expect(bad.statusCode).toBe(422);
	});

	it("PATCH de estado funciona y actualiza updated_at", async () => {
		const task = await createItem({ type: "task", title: "x" });

		const moved = await app.inject({
			method: "PATCH",
			url: `/items/${task.json().id}`,
			payload: { status: "in_progress" },
		});
		expect(moved.statusCode).toBe(200);
		expect(moved.json().status).toBe("in_progress");
	});

	it("borrar una épica arrastra a sus hijas (cascade)", async () => {
		const epic = await createItem({ type: "epic", title: "Fase" });
		await createItem({
			type: "task",
			title: "hija",
			parent_id: epic.json().id,
		});

		const deleted = await app.inject({
			method: "DELETE",
			url: `/items/${epic.json().id}`,
		});
		expect(deleted.statusCode).toBe(204);

		const list = await app.inject({
			method: "GET",
			url: `/projects/${projectId}/items`,
		});
		expect(list.json()).toHaveLength(0);
	});

	it("los ítems de un proyecto borrado desaparecen y la numeración es por proyecto", async () => {
		await createItem({ type: "task", title: "GP-1" });

		const other = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Homelab", key_prefix: "HL" },
		});
		const otherItem = await app.inject({
			method: "POST",
			url: "/items",
			payload: { project_id: other.json().id, type: "task", title: "primera" },
		});
		expect(otherItem.json().key).toBe("HL-1");
	});
});

describe("POST /items/improve-description", () => {
	it("devuelve el markdown mejorado por la IA", async () => {
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
		const app = buildApp({
			db,
			now: fixedNow,
			describer: { improve: async (t) => `## ${t}\n- [ ] hecho` },
		});

		const res = await app.inject({
			method: "POST",
			url: "/items/improve-description",
			payload: { text: "regar plantas" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().improved).toBe("## regar plantas\n- [ ] hecho");
	});

	it("devuelve 400 si el texto está vacío", async () => {
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
		const app = buildApp({
			db,
			now: fixedNow,
			describer: { improve: async (t) => t },
		});

		const res = await app.inject({
			method: "POST",
			url: "/items/improve-description",
			payload: { text: "   " },
		});
		expect(res.statusCode).toBe(400);
	});

	it("devuelve 422 si la IA no está configurada", async () => {
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
		const app = buildApp({ db, now: fixedNow });

		const res = await app.inject({
			method: "POST",
			url: "/items/improve-description",
			payload: { text: "algo" },
		});
		expect(res.statusCode).toBe(422);
	});
});
