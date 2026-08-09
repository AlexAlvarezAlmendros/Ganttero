import type { FastifyInstance, FastifyRequest } from "fastify";
import {
	clearSessionCookie,
	readSessionCookie,
	serializeSessionCookie,
} from "./auth.cookie.js";
import { type SessionResponse, loginSchema } from "./auth.schema.js";
import type { AuthService } from "./auth.service.js";

/** Rutas públicas: sin ellas no habría forma de entrar. */
export const PUBLIC_PATHS = new Set([
	"/health",
	"/auth/login",
	"/auth/logout",
	"/auth/session",
]);

/** Clave del rate limit: la IP del cliente (LAN, un solo usuario). */
function clientKey(request: FastifyRequest): string {
	return request.ip;
}

export function authRoutes(service: AuthService, cookieSecure: boolean) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.post("/auth/login", async (request, reply) => {
			const { username, password } = loginSchema.parse(request.body);
			const token = await service.login(username, password, clientKey(request));
			return reply
				.header(
					"set-cookie",
					serializeSessionCookie(token, {
						secure: cookieSecure,
						maxAgeSeconds: service.sessionMaxAgeSeconds,
					}),
				)
				.send({ authenticated: true, username: service.username });
		});

		app.post("/auth/logout", async (_request, reply) =>
			reply
				.header("set-cookie", clearSessionCookie(cookieSecure))
				.status(204)
				.send(),
		);

		app.get("/auth/session", async (request) => {
			const username = service.verifyToken(
				readSessionCookie(request.headers.cookie),
			);
			const body: SessionResponse = {
				auth_enabled: true,
				authenticated: username !== null,
				username,
			};
			return body;
		});
	};
}

/** Respuesta de `/auth/session` cuando el backend corre sin auth (desarrollo). */
export function disabledAuthRoutes() {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.get("/auth/session", async () => {
			const body: SessionResponse = {
				auth_enabled: false,
				authenticated: true,
				username: null,
			};
			return body;
		});
	};
}
