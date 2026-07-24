import type { FastifyInstance } from "fastify";
import { idParamSchema } from "../items/items.schema.js";
import type { GithubStatus } from "./github.schema.js";
import { createLinkSchema } from "./github.schema.js";
import type { GithubService } from "./github.service.js";

export function githubRoutes(service: GithubService, status: GithubStatus) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.get("/github/status", async () => status);

		app.get("/projects/:id/github", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.listLinks(id);
		});

		app.post("/projects/:id/github", async (request, reply) => {
			const { id } = idParamSchema.parse(request.params);
			const body = createLinkSchema.parse(request.body);
			const link = await service.link(id, body.repo_full_name);
			return reply.status(201).send(link);
		});

		app.delete("/github/links/:id", async (request, reply) => {
			const { id } = idParamSchema.parse(request.params);
			await service.unlink(id);
			return reply.status(204).send();
		});

		app.get("/projects/:id/github/activity", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.activity(id);
		});

		app.get("/items/:id/commits", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.listItemCommits(id);
		});

		/** Escaneo manual (el polling automático corre en index.ts). */
		app.post("/github/scan", async () => service.scanSmartCommits());
	};
}
