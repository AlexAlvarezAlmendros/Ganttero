import { z } from "zod";

export const itemTypeSchema = z.enum(["epic", "task", "subtask"]);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const itemStatusSchema = z.enum([
	"backlog",
	"in_progress",
	"blocked",
	"done",
]);
export type ItemStatus = z.infer<typeof itemStatusSchema>;

/** Día ISO (YYYY-MM-DD): el Gantt trabaja a día vista; la hora no existe aquí. */
export const isoDaySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "fecha en formato YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00Z`);
		return (
			!Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
		);
	}, "fecha inexistente en el calendario");

export const itemSchema = z.object({
	id: z.number().int(),
	project_id: z.number().int(),
	parent_id: z.number().int().nullable(),
	type: itemTypeSchema,
	/** Clave corta legible: GP-42 (prefijo del proyecto + número secuencial). */
	key: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	status: itemStatusSchema,
	start_date: z.string().nullable(),
	end_date: z.string().nullable(),
	estimate_min: z.number().int().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
});
export type Item = z.infer<typeof itemSchema>;

export const createItemSchema = z
	.object({
		project_id: z.number().int().positive(),
		parent_id: z.number().int().positive().nullish(),
		type: itemTypeSchema,
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(5000).nullish(),
		start_date: isoDaySchema.nullish(),
		end_date: isoDaySchema.nullish(),
		estimate_min: z.number().int().positive().nullish(),
	})
	.refine(
		(data) =>
			!data.start_date || !data.end_date || data.start_date <= data.end_date,
		{
			message: "end_date no puede ser anterior a start_date",
			path: ["end_date"],
		},
	);
export type CreateItem = z.infer<typeof createItemSchema>;

export const updateItemSchema = z
	.object({
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(5000).nullable(),
		status: itemStatusSchema,
		parent_id: z.number().int().positive().nullable(),
		start_date: isoDaySchema.nullable(),
		end_date: isoDaySchema.nullable(),
		estimate_min: z.number().int().positive().nullable(),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, {
		message: "el patch no puede estar vacío",
	});
export type UpdateItem = z.infer<typeof updateItemSchema>;

export const idParamSchema = z.object({
	id: z.coerce.number().int().positive(),
});

/** "Mejorar formato": texto libre → markdown mejorado (sin estado, sin id). */
export const improveDescriptionSchema = z.object({
	text: z.string().trim().min(1).max(5000),
});
export type ImproveDescription = z.infer<typeof improveDescriptionSchema>;

export const improvedDescriptionSchema = z.object({
	improved: z.string(),
});
export type ImprovedDescription = z.infer<typeof improvedDescriptionSchema>;
