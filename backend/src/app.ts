import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { Client } from "./db/client.js";
import {
	ConflictError,
	DomainError,
	NotFoundError,
	TooManyRequestsError,
	UnauthorizedError,
} from "./lib/errors.js";
import { readSessionCookie } from "./modules/auth/auth.cookie.js";
import {
	PUBLIC_PATHS,
	authRoutes,
	disabledAuthRoutes,
} from "./modules/auth/auth.routes.js";
import type { AuthService } from "./modules/auth/auth.service.js";
import type { GitHubClient } from "./modules/github/github.client.js";
import { GithubRepo } from "./modules/github/github.repo.js";
import { githubRoutes } from "./modules/github/github.routes.js";
import type { GithubStatus } from "./modules/github/github.schema.js";
import { GithubService } from "./modules/github/github.service.js";
import type { Describer } from "./modules/items/items.describer.js";
import { ItemsRepo } from "./modules/items/items.repo.js";
import { itemsRoutes } from "./modules/items/items.routes.js";
import { ItemsService } from "./modules/items/items.service.js";
import { kanbanRoutes } from "./modules/kanban/kanban.routes.js";
import { KanbanService } from "./modules/kanban/kanban.service.js";
import { ProjectsRepo } from "./modules/projects/projects.repo.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";
import { ProjectsService } from "./modules/projects/projects.service.js";
import { SettingsRepo } from "./modules/settings/settings.repo.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";
import { TimelogRepo } from "./modules/timelog/timelog.repo.js";
import { timelogRoutes } from "./modules/timelog/timelog.routes.js";
import { TimelogService } from "./modules/timelog/timelog.service.js";
import { voiceRoutes } from "./modules/voice/voice.routes.js";
import type { VoiceService } from "./modules/voice/voice.service.js";

export interface BuildAppOptions {
	logger?: boolean;
	db?: Client;
	/** Reloj inyectable: los tests fijan "hoy"; producción usa el real. */
	now?: () => Date;
	/** Pipeline de voz (Fase 5): inyectado desde index.ts; los tests lo mockean. */
	voice?: { service: VoiceService; audioDir: string };
	/** GitHub (Fase 6): cliente inyectado; los tests lo mockean. */
	github?: { client: GitHubClient; status: GithubStatus };
	/** IA de descripciones (Fase 8): "mejorar formato"; los tests la mockean. */
	describer?: Describer;
	/**
	 * Autenticación (Fase 9). Si no se pasa, la API queda abierta: `index.ts`
	 * solo lo permite fuera de producción (ver `config/env.ts`).
	 */
	auth?: { service: AuthService; cookieSecure: boolean };
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
	const { logger = false, db, now, voice, github, describer, auth } = options;
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
		if (error instanceof UnauthorizedError) {
			return reply.status(401).send({ error: error.message });
		}
		if (error instanceof TooManyRequestsError) {
			return reply
				.status(429)
				.header("retry-after", String(error.retryAfterSeconds))
				.send({ error: error.message });
		}
		if (error instanceof DomainError) {
			return reply.status(422).send({ error: error.message });
		}
		app.log.error(error);
		return reply.status(500).send({ error: "error interno" });
	});

	// Puerta única: se registra ANTES que las rutas, de modo que cualquier ruta
	// nueva nace protegida salvo que se añada explícitamente a PUBLIC_PATHS.
	if (auth) {
		app.addHook("onRequest", async (request) => {
			const path = request.url.split("?")[0] ?? "";
			if (PUBLIC_PATHS.has(path)) {
				return;
			}
			const username = auth.service.verifyToken(
				readSessionCookie(request.headers.cookie),
			);
			if (username === null) {
				throw new UnauthorizedError();
			}
		});
		app.register(authRoutes(auth.service, auth.cookieSecure));
	} else {
		app.register(disabledAuthRoutes());
	}

	app.get("/health", async (_request, reply) => {
		if (!db) {
			return { status: "ok", db: "none" };
		}
		try {
			await db.execute("SELECT 1");
			return { status: "ok", db: "ok" };
		} catch {
			return reply.status(503).send({ status: "degraded", db: "error" });
		}
	});

	if (db) {
		const projectsRepo = new ProjectsRepo(db);
		const itemsRepo = new ItemsRepo(db);
		const settingsRepo = new SettingsRepo(db);
		const projectsService = new ProjectsService(projectsRepo, now);
		const timelogService = new TimelogService(new TimelogRepo(db), now);
		const itemsService = new ItemsService(
			itemsRepo,
			projectsRepo,
			now,
			(item, previous) => timelogService.onStatusChange(item, previous),
			describer,
		);
		const kanbanService = new KanbanService(
			itemsRepo,
			projectsRepo,
			settingsRepo,
			now,
		);
		app.register(projectsRoutes(projectsService));
		app.register(itemsRoutes(itemsService));
		app.register(timelogRoutes(timelogService, itemsService));
		app.register(kanbanRoutes(kanbanService));
		app.register(settingsRoutes(settingsRepo));
		if (voice) {
			app.register(voiceRoutes(voice.service, settingsRepo, voice.audioDir));
		}
		if (github) {
			const githubService = new GithubService(
				new GithubRepo(db),
				projectsRepo,
				github.client,
				itemsService,
				now,
				(message) => app.log.info(message),
			);
			app.decorate("githubService", githubService);
			app.register(githubRoutes(githubService, github.status));
		}
	}

	return app;
}
