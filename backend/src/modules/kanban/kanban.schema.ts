import { z } from "zod";
import { itemSchema, itemStatusSchema } from "../items/items.schema.js";

/** Prioridad DERIVADA — nunca se persiste (regla de negocio). */
export const derivedPrioritySchema = z.enum([
	"late",
	"now",
	"normal",
	"blocked",
	"done",
]);
export type DerivedPriority = z.infer<typeof derivedPrioritySchema>;

export const kanbanCardSchema = itemSchema.extend({
	priority: derivedPrioritySchema,
});
export type KanbanCard = z.infer<typeof kanbanCardSchema>;

export const kanbanBoardSchema = z.object({
	project_id: z.number().int(),
	today: z.string(),
	window_days: z.number().int(),
	columns: z.record(itemStatusSchema, z.array(kanbanCardSchema)),
});
export type KanbanBoard = z.infer<typeof kanbanBoardSchema>;
