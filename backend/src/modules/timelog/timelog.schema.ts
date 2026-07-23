import { z } from "zod";

export const timeLogSchema = z.object({
	id: z.number().int(),
	item_id: z.number().int(),
	started_at: z.string(),
	ended_at: z.string().nullable(),
	duration_sec: z.number().int().nullable(),
});
export type TimeLog = z.infer<typeof timeLogSchema>;

export const timelogSummarySchema = z.object({
	item_id: z.number().int(),
	/** Segundos totales: tramos cerrados + tramo abierto (si lo hay) hasta "ahora". */
	total_sec: z.number().int(),
	running: z.boolean(),
	logs: z.array(timeLogSchema),
});
export type TimelogSummary = z.infer<typeof timelogSummarySchema>;
