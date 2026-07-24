import { z } from "zod";
import { isoDaySchema, itemTypeSchema } from "../items/items.schema.js";

/**
 * Contrato de salida de la IA — heredero directo del spike (Fase 0).
 * Campos no mencionados en el audio → null; la IA nunca inventa.
 */
export const capturedItemSchema = z
	.object({
		title: z.string().trim().min(1).max(200),
		type: itemTypeSchema,
		description: z.string().trim().min(1).nullable(),
		estimate_min: z.number().int().positive().nullable(),
		start_date: isoDaySchema.nullable(),
		end_date: isoDaySchema.nullable(),
		dependencies: z.array(z.string().trim().min(1)),
	})
	.strict()
	.refine(
		(item) =>
			item.start_date === null ||
			item.end_date === null ||
			item.start_date <= item.end_date,
		{
			message: "end_date no puede ser anterior a start_date",
			path: ["end_date"],
		},
	);
export type CapturedItem = z.infer<typeof capturedItemSchema>;

export const voiceCaptureResponseSchema = z.object({
	transcript: z.string(),
	item: capturedItemSchema,
	stt_sec: z.number(),
	llm_sec: z.number(),
	attempts: z.number().int(),
	audio_path: z.string().nullable(),
});
export type VoiceCaptureResponse = z.infer<typeof voiceCaptureResponseSchema>;
