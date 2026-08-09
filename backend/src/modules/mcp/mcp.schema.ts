import { z } from "zod";
import {
	isoDaySchema,
	itemStatusSchema,
	itemTypeSchema,
} from "../items/items.schema.js";

/**
 * MCP sobre Streamable HTTP: el transporte es JSON-RPC 2.0 por POST.
 * Sin dependencias nuevas — la superficie del protocolo que necesitamos son
 * cuatro métodos, y el SDK oficial traería un transporte pensado para Express.
 */

/** Versión del protocolo que anunciamos en `initialize`. */
export const MCP_PROTOCOL_VERSION = "2025-06-18";

export const jsonRpcRequestSchema = z.object({
	jsonrpc: z.literal("2.0"),
	/** Ausente = notificación: se acusa recibo sin cuerpo. */
	id: z.union([z.string(), z.number()]).nullish(),
	method: z.string().min(1),
	params: z.unknown().optional(),
});
export type JsonRpcRequest = z.infer<typeof jsonRpcRequestSchema>;

/** Un POST puede traer una petición o un lote. */
export const jsonRpcBodySchema = z.union([
	jsonRpcRequestSchema,
	z.array(jsonRpcRequestSchema).min(1),
]);

export interface JsonRpcResponse {
	jsonrpc: "2.0";
	id: string | number | null;
	result?: unknown;
	error?: { code: number; message: string; data?: unknown };
}

/** Códigos estándar de JSON-RPC 2.0. */
export const RPC = {
	parseError: -32700,
	invalidRequest: -32600,
	methodNotFound: -32601,
	invalidParams: -32602,
	internalError: -32603,
} as const;

// ── Entradas de las herramientas ────────────────────────────────────────────

export const listItemsInput = z.object({
	project_id: z.number().int().positive().optional(),
	status: itemStatusSchema.optional(),
	type: itemTypeSchema.optional(),
	/** Por defecto se ocultan las hechas: el agente quiere lo que queda vivo. */
	include_done: z.boolean().default(false),
});

export const itemIdInput = z.object({
	item_id: z.number().int().positive(),
});

export const createItemInput = z.object({
	project_id: z.number().int().positive(),
	type: itemTypeSchema.default("task"),
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(5000).optional(),
	parent_id: z.number().int().positive().optional(),
	start_date: isoDaySchema.optional(),
	end_date: isoDaySchema.optional(),
	estimate_min: z.number().int().positive().optional(),
});

export const updateItemInput = z
	.object({
		item_id: z.number().int().positive(),
		title: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(5000).nullable().optional(),
		parent_id: z.number().int().positive().nullable().optional(),
		start_date: isoDaySchema.nullable().optional(),
		end_date: isoDaySchema.nullable().optional(),
		estimate_min: z.number().int().positive().nullable().optional(),
	})
	.refine((input) => Object.keys(input).length > 1, {
		message: "indica al menos un campo a modificar además de item_id",
	});

export const setStatusInput = z.object({
	item_id: z.number().int().positive(),
	status: itemStatusSchema,
});

export const kanbanInput = z.object({
	project_id: z.number().int().positive().optional(),
});
