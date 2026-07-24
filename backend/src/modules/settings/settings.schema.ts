import { z } from "zod";

export const settingsSchema = z.object({
	kanban_window_days: z.number().int().min(1).max(60),
	/** Conservar los audios de voz tras transcribir (en el NAS). */
	retain_audio: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsSchema = z
	.object({
		kanban_window_days: z.number().int().min(1).max(60),
		retain_audio: z.boolean(),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, {
		message: "el patch no puede estar vacío",
	});
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
