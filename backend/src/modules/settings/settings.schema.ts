import { z } from "zod";

export const settingsSchema = z.object({
	kanban_window_days: z.number().int().min(1).max(60),
});
export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsSchema = z.object({
	kanban_window_days: z.number().int().min(1).max(60),
});
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
