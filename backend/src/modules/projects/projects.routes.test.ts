import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../build-app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";

const fixedNow = () => new Date("2026-07-23T10:00:00.000Z");

async function testApp(): Promise<FastifyInstance> {
	const db = await createDbClient(":memory:");
	await migrateUp(db, migrations, { now: fixedNow });
	return buildApp({ db, now: fixedNow });
}

describe("rutas /projects", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		app = await testApp();
	});

	it("POST crea un proyecto y GET lo lista", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "gp", description: "la app" },
		});

		expect(created.statusCode).toBe(201);
		const project = created.json();
		expect(project.key_prefix).toBe("GP"); // normalizado a mayúsculas
		expect(project.created_at).toBe("2026-07-23T10:00:00.000Z");

		const list = await app.inject({ method: "GET", url: "/projects" });
		expect(list.json()).toHaveLength(1);
	});

	it("POST con prefijo duplicado devuelve 409", async () => {
		const payload = { name: "Uno", key_prefix: "GP" };
		await app.inject({ method: "POST", url: "/projects", payload });

		const dup = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Dos", key_prefix: "GP" },
		});

		expect(dup.statusCode).toBe(409);
	});

	it("POST con body inválido devuelve 400 con issues", async () => {
		const bad = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "", key_prefix: "demasiadolargo" },
		});

		expect(bad.statusCode).toBe(400);
		expect(bad.json().issues.length).toBeGreaterThan(0);
	});

	it("GET /projects/:id devuelve 404 si no existe", async () => {
		const missing = await app.inject({ method: "GET", url: "/projects/99" });
		expect(missing.statusCode).toBe(404);
	});

	it("PATCH archiva y desarchiva", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});
		const id = created.json().id;

		const archived = await app.inject({
			method: "PATCH",
			url: `/projects/${id}`,
			payload: { archived: true },
		});
		expect(archived.json().archived_at).toBe("2026-07-23T10:00:00.000Z");

		const restored = await app.inject({
			method: "PATCH",
			url: `/projects/${id}`,
			payload: { archived: false },
		});
		expect(restored.json().archived_at).toBeNull();
	});

	it("PATCH vacío devuelve 400", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});

		const empty = await app.inject({
			method: "PATCH",
			url: `/projects/${created.json().id}`,
			payload: {},
		});
		expect(empty.statusCode).toBe(400);
	});

	it("DELETE borra y devuelve 404 la segunda vez", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});
		const id = created.json().id;

		const deleted = await app.inject({
			method: "DELETE",
			url: `/projects/${id}`,
		});
		expect(deleted.statusCode).toBe(204);

		const again = await app.inject({
			method: "DELETE",
			url: `/projects/${id}`,
		});
		expect(again.statusCode).toBe(404);
	});
});
