import { z } from "zod";
import { type CapturedItem, capturedItemSchema } from "./voice.schema.js";

/**
 * Transcripción → JSON de tarea con Gemma vía Ollama. Portado del spike
 * (Fase 0) con el prompt endurecido que eliminó la invención de fechas.
 * Doble cinturón: `format` (solo tipos/enum — las restricciones finas
 * rompen el compilador de gramática de Ollama) + Zod + reintento.
 */

const capturedItemJsonSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"title",
		"type",
		"description",
		"estimate_min",
		"start_date",
		"end_date",
		"dependencies",
	],
	properties: {
		title: { type: "string" },
		type: { enum: ["epic", "task", "subtask"] },
		description: { type: ["string", "null"] },
		estimate_min: { type: ["integer", "null"] },
		start_date: { type: ["string", "null"] },
		end_date: { type: ["string", "null"] },
		dependencies: { type: "array", items: { type: "string" } },
	},
} as const;

function buildPrompt(transcript: string, today: string): string {
	return `Eres el extractor de tareas de una app de planificación personal.
Convierte la transcripción de una nota de voz en UN único ítem JSON.

Reglas:
- "type": "epic" si describe un bloque grande que agrupa varios trabajos; "subtask" si dice ser parte de otra tarea; ante la duda, "task".
- "start_date" y "end_date": SOLO si el audio dice cuándo («mañana», «el viernes», «la semana que viene»). Si el audio no menciona ningún momento, ambas son null. Que una tarea "haya que hacerla" NO significa que empiece hoy.
- Hoy es ${today}, solo como referencia para convertir fechas relativas a YYYY-MM-DD.
- "estimate_min": duración en minutos SOLO si se menciona («dos horas» → 120); si no, null.
- "dependencies": títulos de otras tareas SOLO si se citan; si no, [].
- "title": imperativo corto y limpio, sin muletillas; conserva los nombres propios tal cual suenan.
- "description": matices que no caben en el título, o null si no aporta nada.

Ejemplo: «hay que regar las plantas» → {"title": "Regar las plantas", "type": "task", "description": null, "estimate_min": null, "start_date": null, "end_date": null, "dependencies": []}
Ejemplo: «mañana empiezo el informe, me llevará una hora» (con hoy = 2026-07-23) → {"title": "Hacer el informe", "type": "task", "description": null, "estimate_min": 60, "start_date": "2026-07-24", "end_date": null, "dependencies": []}

Transcripción: «${transcript}»`;
}

const ollamaChatResponseSchema = z.object({
	message: z.object({ content: z.string() }),
});

export class StructureError extends Error {
	constructor(
		message: string,
		readonly attempts: number,
	) {
		super(message);
		this.name = "StructureError";
	}
}

export interface StructurerOptions {
	baseUrl: string;
	model: string;
	maxAttempts?: number;
	fetchFn?: typeof fetch;
}

export interface Structurer {
	structure(
		transcript: string,
		today: string,
	): Promise<{ item: CapturedItem; attempts: number }>;
}

export class OllamaStructurer implements Structurer {
	constructor(private readonly options: StructurerOptions) {}

	async structure(
		transcript: string,
		today: string,
	): Promise<{ item: CapturedItem; attempts: number }> {
		const { baseUrl, model, maxAttempts = 3, fetchFn = fetch } = this.options;
		const messages: Array<{ role: "user" | "assistant"; content: string }> = [
			{ role: "user", content: buildPrompt(transcript, today) },
		];

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const response = await fetchFn(`${baseUrl}/api/chat`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					model,
					messages,
					format: capturedItemJsonSchema,
					stream: false,
					options: { temperature: 0 },
				}),
			});
			if (!response.ok) {
				throw new StructureError(
					`Ollama respondió ${response.status}`,
					attempt,
				);
			}

			const payload = ollamaChatResponseSchema.parse(await response.json());
			let candidate: unknown;
			try {
				candidate = JSON.parse(payload.message.content);
			} catch {
				candidate = null;
			}

			const parsed = capturedItemSchema.safeParse(candidate);
			if (parsed.success) {
				return { item: parsed.data, attempts: attempt };
			}

			messages.push(
				{ role: "assistant", content: payload.message.content },
				{
					role: "user",
					content: `Ese JSON no cumple el contrato: ${JSON.stringify(parsed.error.issues)}. Corrígelo y responde solo con el JSON.`,
				},
			);
		}

		throw new StructureError(
			`sin JSON válido tras ${maxAttempts} intentos`,
			maxAttempts,
		);
	}
}
