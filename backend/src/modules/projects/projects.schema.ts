import { z } from "zod";

export const projectSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	key_prefix: z.string(),
	description: z.string().nullable(),
	created_at: z.string(),
	archived_at: z.string().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
	name: z.string().trim().min(1).max(80),
	key_prefix: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z][A-Z0-9]{0,5}$/, "prefijo corto tipo GP (1-6 mayúsculas)"),
	description: z.string().trim().max(300).nullish(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		description: z.string().trim().max(300).nullable(),
		archived: z.boolean(),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, {
		message: "el patch no puede estar vacío",
	});
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export const idParamSchema = z.object({
	id: z.coerce.number().int().positive(),
});
