import { ZodError } from "zod";
import { DomainError, NotFoundError } from "../../lib/errors.js";
import {
	type JsonRpcRequest,
	type JsonRpcResponse,
	MCP_PROTOCOL_VERSION,
	RPC,
} from "./mcp.schema.js";
import { MCP_TOOLS, MCP_TOOLS_BY_NAME, type McpDeps } from "./mcp.tools.js";

/**
 * Capa de protocolo MCP: traduce JSON-RPC a llamadas de servicio y de vuelta.
 * No sabe de HTTP (eso es `mcp.routes.ts`) ni de SQL.
 */
export class McpService {
	constructor(
		private readonly deps: McpDeps,
		private readonly serverVersion = "1.0.0",
	) {}

	/** `null` = era una notificación: el transporte responde 202 sin cuerpo. */
	async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
		const id = request.id ?? null;
		const isNotification = request.id === undefined || request.id === null;

		try {
			const result = await this.dispatch(request);
			return isNotification ? null : { jsonrpc: "2.0", id, result };
		} catch (error) {
			if (isNotification) {
				return null;
			}
			return { jsonrpc: "2.0", id, error: toRpcError(error) };
		}
	}

	private async dispatch(request: JsonRpcRequest): Promise<unknown> {
		switch (request.method) {
			case "initialize":
				return {
					protocolVersion: MCP_PROTOCOL_VERSION,
					capabilities: { tools: { listChanged: false } },
					serverInfo: { name: "ganttero", version: this.serverVersion },
					instructions:
						"Ganttero planifica en un Gantt y deriva el Kanban de él. El *cuándo* vive en las fechas del ítem; el tablero no se rellena a mano. Mueve el estado con set_item_status: eso registra el tiempo solo.",
				};
			case "notifications/initialized":
			case "notifications/cancelled":
				return null;
			case "ping":
				return {};
			case "tools/list":
				return {
					tools: MCP_TOOLS.map((tool) => ({
						name: tool.name,
						description: tool.description,
						inputSchema: tool.inputSchema,
					})),
				};
			case "tools/call":
				return this.callTool(request.params);
			default:
				throw new MethodNotFound(request.method);
		}
	}

	private async callTool(params: unknown): Promise<unknown> {
		const { name, arguments: args } = (params ?? {}) as {
			name?: unknown;
			arguments?: unknown;
		};
		if (typeof name !== "string") {
			throw new InvalidParams("falta el nombre de la herramienta");
		}
		const tool = MCP_TOOLS_BY_NAME.get(name);
		if (!tool) {
			throw new MethodNotFound(`herramienta ${name}`);
		}
		try {
			const output = await tool.run(this.deps, args);
			return {
				content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
				isError: false,
			};
		} catch (error) {
			// Un fallo de la herramienta NO es un error de protocolo: se devuelve
			// como resultado con isError para que el agente pueda corregirse.
			return {
				content: [{ type: "text", text: describe(error) }],
				isError: true,
			};
		}
	}
}

class MethodNotFound extends Error {
	constructor(what: string) {
		super(`método desconocido: ${what}`);
	}
}
class InvalidParams extends Error {}

function describe(error: unknown): string {
	if (error instanceof ZodError) {
		return `parámetros inválidos: ${error.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("; ")}`;
	}
	if (error instanceof NotFoundError || error instanceof DomainError) {
		return error.message;
	}
	return error instanceof Error ? error.message : "error desconocido";
}

function toRpcError(error: unknown): { code: number; message: string } {
	if (error instanceof MethodNotFound) {
		return { code: RPC.methodNotFound, message: error.message };
	}
	if (error instanceof InvalidParams || error instanceof ZodError) {
		return { code: RPC.invalidParams, message: describe(error) };
	}
	return { code: RPC.internalError, message: describe(error) };
}
