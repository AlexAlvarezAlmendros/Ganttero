import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../../lib/errors.js";
import { type JsonRpcResponse, RPC, jsonRpcBodySchema } from "./mcp.schema.js";
import type { McpService } from "./mcp.service.js";

/** Ruta única del transporte Streamable HTTP. */
export const MCP_PATH = "/mcp";

/**
 * Comparación en tiempo constante de tokens de longitud distinta: se comparan
 * sus SHA-256, que siempre miden lo mismo (`timingSafeEqual` exige igual
 * longitud y lanzaría con tokens de distinto tamaño).
 */
function tokenMatches(given: string, expected: string): boolean {
	const digest = (value: string) =>
		createHash("sha256").update(value, "utf8").digest();
	return timingSafeEqual(digest(given), digest(expected));
}

function bearerOf(request: FastifyRequest): string | null {
	const header = request.headers.authorization;
	if (typeof header !== "string") return null;
	const [scheme, ...rest] = header.split(" ");
	if (scheme?.toLowerCase() !== "bearer") return null;
	const token = rest.join(" ").trim();
	return token.length > 0 ? token : null;
}

/**
 * Endpoint MCP (Streamable HTTP) para agentes de IA — Claude Code y compañía.
 *
 * Autenticación propia por **bearer**, no la cookie de sesión del navegador:
 * un agente no hace login interactivo. Por eso `app.ts` exime esta ruta del
 * hook global de sesión — la puerta la pone esta misma ruta, y sin token
 * configurado el módulo ni siquiera se registra.
 */
export function mcpRoutes(service: McpService, token: string) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.post(MCP_PATH, async (request, reply) => {
			const given = bearerOf(request);
			if (given === null || !tokenMatches(given, token)) {
				throw new UnauthorizedError();
			}

			const parsed = jsonRpcBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					jsonrpc: "2.0",
					id: null,
					error: { code: RPC.invalidRequest, message: "JSON-RPC inválido" },
				});
			}

			const batch = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
			const responses: JsonRpcResponse[] = [];
			for (const message of batch) {
				const response = await service.handle(message);
				if (response) responses.push(response);
			}

			// Solo notificaciones: acuse sin cuerpo, como manda el transporte.
			if (responses.length === 0) {
				return reply.status(202).send();
			}
			return reply
				.header("content-type", "application/json")
				.send(Array.isArray(parsed.data) ? responses : responses[0]);
		});

		// El servidor no abre flujos por su cuenta ni mantiene sesión: el cliente
		// solo necesita POST. Se responde explícitamente para no dar un 404 confuso.
		for (const method of ["get", "delete"] as const) {
			app[method](MCP_PATH, async (_request, reply) =>
				reply
					.status(405)
					.header("allow", "POST")
					.send({ error: "este servidor MCP solo acepta POST" }),
			);
		}
	};
}
