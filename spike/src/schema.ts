import { z } from "zod";

/**
 * Contrato de salida de la IA (Fase 0 y, más adelante, módulo `voice`).
 *
 * Reglas del contrato con Gemma:
 * - Todo campo que no se mencione en el audio se devuelve como `null`,
 *   nunca se inventa (los LLM manejan mejor null explícito que campos ausentes).
 * - Fechas en ISO-8601 (`YYYY-MM-DD`), sin hora: la app trabaja a día vista
 *   y la conversión a UTC/local es cosa de la app, no de la IA.
 * - `dependencies` son títulos citados de otras tareas ("después de X");
 *   la resolución a IDs reales ocurre fuera del pipeline de voz.
 */

const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "fecha en formato YYYY-MM-DD")
	.refine((s) => {
		const d = new Date(`${s}T00:00:00Z`);
		return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
	}, "fecha inexistente en el calendario");

export const capturedItemSchema = z
	.object({
		title: z.string().trim().min(1).max(200),
		type: z.enum(["epic", "task", "subtask"]),
		description: z.string().trim().min(1).nullable(),
		estimate_min: z.number().int().positive().nullable(),
		start_date: isoDate.nullable(),
		end_date: isoDate.nullable(),
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

/**
 * Valida la respuesta cruda de la IA. Devuelve el resultado tal cual de Zod
 * para que el orquestador decida: reintentar con el error como feedback o
 * hacer fallback a formulario manual.
 */
export function parseCapturedItem(raw: unknown) {
	return capturedItemSchema.safeParse(raw);
}

/**
 * JSON Schema simplificado del contrato, para incrustarlo en el prompt de
 * Gemma (structured output). Mantener sincronizado con `capturedItemSchema`.
 */
export const capturedItemJsonShape = `{
  "title": "string (obligatorio, máx. 200 caracteres)",
  "type": "\\"epic\\" | \\"task\\" | \\"subtask\\"",
  "description": "string | null",
  "estimate_min": "número entero de minutos | null",
  "start_date": "\\"YYYY-MM-DD\\" | null",
  "end_date": "\\"YYYY-MM-DD\\" | null (nunca anterior a start_date)",
  "dependencies": ["títulos de tareas de las que depende (puede ser vacío)"]
}`;
