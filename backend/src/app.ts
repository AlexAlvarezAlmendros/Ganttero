import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { Client } from "./db/client.js";
import { ConflictError, DomainError, NotFoundError } from "./lib/errors.js";
import { ItemsRepo } from "./modules/items/items.repo.js";
import { itemsRoutes } from "./modules/items/items.routes.js";
import { ItemsService } from "./modules/items/items.service.js";
import { ProjectsRepo } from "./modules/projects/projects.repo.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";
import { ProjectsService } from "./modules/projects/projects.service.js";
import { TimelogRepo } from "./modules/timelog/timelog.repo.js";
import { timelogRoutes } from "./modules/timelog/timelog.routes.js";
import { TimelogService } from "./modules/timelog/timelog.service.js";

export interface BuildAppOptions {
	logger?: boolean;
	db?: Client;
	/** Reloj inyectable: los tests fijan "hoy"; producción usa el real. */
	now?: () => Date;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
	const { logger = false, db, now } = options;
	const app = Fastify({ logger });

	app.setErrorHandler((error, _request, reply) => {
		if (error instanceof ZodError) {
			return reply.status(400).send({
				error: "validación",
				issues: error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			});
		}
		if (error instanceof NotFoundError) {
			return reply.status(404).send({ error: error.message });
		}
		if (error instanceof ConflictError) {
			return reply.status(409).send({ error: error.message });
		}
		if (error instanceof DomainError) {
			return reply.status(422).send({ error: error.message });
		}
		app.log.error(error);
		return reply.status(500).send({ error: "error interno" });
	});

	app.get("/health", async () => ({ status: "ok" }));

	if (db) {
		const projectsRepo = new ProjectsRepo(db);
		const projectsService = new ProjectsService(projectsRepo, now);
		const timelogService = new TimelogService(new TimelogRepo(db), now);
		const itemsService = new ItemsService(
			new ItemsRepo(db),
			projectsRepo,
			now,
			(item, previous) => timelogService.onStatusChange(item, previous),
		);
		app.register(projectsRoutes(projectsService));
		app.register(itemsRoutes(itemsService));
		app.register(timelogRoutes(timelogService, itemsService));
	}

	return app;
}
