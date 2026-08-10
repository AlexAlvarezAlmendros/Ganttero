import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../build-app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";
import type { GitHubClient, GitHubCommit } from "./github.client.js";

const fixedNow = () => new Date(2026, 6, 24, 12, 0);

function commit(sha: string, message: string): GitHubCommit {
	return {
		sha,
		message,
		url: `https://github.com/x/y/commit/${sha}`,
		committed_at: "2026-07-24T09:00:00Z",
	};
}

function mockClient(commits: GitHubCommit[]): GitHubClient {
	return {
		branches: vi.fn().mockResolvedValue([{ name: "main" }]),
		commits: vi.fn().mockResolvedValue(commits),
		issues: vi.fn().mockResolvedValue([]),
		pulls: vi.fn().mockResolvedValue([]),
	};
}

describe("GithubService (vía rutas, con cliente mockeado)", () => {
	let app: FastifyInstance;
	let client: GitHubClient;
	let projectId: number;
	let taskId: number;

	async function boot(commits: GitHubCommit[]) {
		client = mockClient(commits);
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
		app = buildApp({
			db,
			now: fixedNow,
			github: {
				client,
				status: { token_configured: true, poll_seconds: 300 },
			},
		});
		const project = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});
		projectId = project.json().id;
		const task = await app.inject({
			method: "POST",
			url: "/items",
			payload: { project_id: projectId, type: "task", title: "parser" },
		});
		taskId = task.json().id; // clave GP-1
		await app.inject({
			method: "POST",
			url: `/projects/${projectId}/github`,
			payload: { repo_full_name: "alex/ganttero" },
		});
	}

	it("enlaza un commit que cita GP-1 y aparece en /items/:id/commits", async () => {
		await boot([commit("abc1234", "GP-1 primer parser funcionando")]);

		const scan = await app.inject({ method: "POST", url: "/github/scan" });
		expect(scan.json()).toEqual({ linked: 1, closed: 0 });

		const commits = await app.inject({
			method: "GET",
			url: `/items/${taskId}/commits`,
		});
		expect(commits.json()).toHaveLength(1);
		expect(commits.json()[0].sha).toBe("abc1234");
	});

	it("«fixes GP-1» cierra la tarea Y arranca el flujo de estado (hito de la fase)", async () => {
		await boot([commit("def5678", "fixes GP-1: parser completo")]);

		const scan = await app.inject({ method: "POST", url: "/github/scan" });
		expect(scan.json()).toEqual({ linked: 1, closed: 1 });

		const item = await app.inject({ method: "GET", url: `/items/${taskId}` });
		expect(item.json().status).toBe("done");
	});

	it("re-escanear es idempotente: ni duplica ni re-cierra", async () => {
		await boot([commit("abc1234", "cierra GP-1 hecho")]);
		await app.inject({ method: "POST", url: "/github/scan" });

		// la tarea se reabre a mano…
		await app.inject({
			method: "PATCH",
			url: `/items/${taskId}`,
			payload: { status: "in_progress" },
		});
		// …y el siguiente escaneo del MISMO commit no debe volver a cerrarla
		const second = await app.inject({ method: "POST", url: "/github/scan" });
		expect(second.json()).toEqual({ linked: 0, closed: 0 });

		const item = await app.inject({ method: "GET", url: `/items/${taskId}` });
		expect(item.json().status).toBe("in_progress");
	});

	it("claves desconocidas (HL-9) y texto sin clave se ignoran", async () => {
		await boot([
			commit("aaa", "HL-9 esto es de otro proyecto"),
			commit("bbb", "refactor sin clave"),
		]);

		const scan = await app.inject({ method: "POST", url: "/github/scan" });
		expect(scan.json()).toEqual({ linked: 0, closed: 0 });
	});

	it("un repo caído no tumba el escaneo del resto", async () => {
		await boot([commit("abc1234", "GP-1 avanza")]);
		await app.inject({
			method: "POST",
			url: `/projects/${projectId}/github`,
			payload: { repo_full_name: "alex/roto" },
		});
		let call = 0;
		client.commits = vi.fn().mockImplementation(async () => {
			call++;
			if (call === 2) throw new Error("500 de GitHub");
			return [commit("abc1234", "GP-1 avanza")];
		});

		const scan = await app.inject({ method: "POST", url: "/github/scan" });
		expect(scan.statusCode).toBe(200);
		expect(scan.json().linked).toBe(1);
	});

	it("enlazar el mismo repo dos veces da 409 y el activity agrega por repo", async () => {
		await boot([commit("abc1234", "GP-1 avanza")]);

		const dup = await app.inject({
			method: "POST",
			url: `/projects/${projectId}/github`,
			payload: { repo_full_name: "alex/ganttero" },
		});
		expect(dup.statusCode).toBe(409);

		const activity = await app.inject({
			method: "GET",
			url: `/projects/${projectId}/github/activity`,
		});
		expect(activity.json()).toHaveLength(1);
		expect(activity.json()[0].branches).toEqual([{ name: "main" }]);
	});

	it("el status expone si hay token sin filtrarlo jamás", async () => {
		await boot([]);
		const status = await app.inject({ method: "GET", url: "/github/status" });
		expect(status.json()).toEqual({
			token_configured: true,
			poll_seconds: 300,
		});
	});
});
