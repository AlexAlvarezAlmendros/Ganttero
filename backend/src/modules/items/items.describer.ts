import { z } from "zod";

/**
 * "Mejorar formato": una descripción libre → markdown limpio y enriquecido,
 * con Gemma vía Ollama. Mismo transporte que `voice.structurer.ts` pero la
 * salida es markdown libre (no JSON), así que no usa `format`/gramática.
 *
 * Modo reformatear + enriquecer (decisión de producto 2026-07-24): puede
 * reestructurar, aclarar, expandir y proponer subtareas como checklist, sin
 * contradecir lo que el usuario ya escribió.
 */

/** Techo de salida: la `description` admite hasta 5000 chars; dejamos margen. */
const MAX_OUTPUT_CHARS = 4500;

function buildSystemPrompt(): string {
	return `Eres un asistente que mejora el formato de las descripciones de tareas de una app de planificación personal.

Recibes el texto (posiblemente en markdown) de la descripción de UNA tarea y devuelves una versión mejorada EN MARKDOWN.

Reglas:
- Reestructura para que se lea claro: títulos cortos, listas con viñetas y checklists ("- [ ] ...") cuando haya pasos o subtareas.
- Puedes aclarar, expandir y proponer subtareas razonables que se deriven de lo escrito, pero NUNCA inventes datos concretos (fechas, nombres, cifras) que el usuario no haya dado.
- Conserva la intención y los nombres propios tal cual.
- No añadas preámbulos, comentarios ni explicaciones sobre lo que has hecho.
- Responde SOLO con el markdown de la descripción, sin envolverlo en bloques de código.
- Escribe en el mismo idioma que el texto original.`;
}

/** Ollama a veces envuelve la salida en un bloque ```; lo quitamos. */
function stripCodeFence(content: string): string {
	const trimmed = content.trim();
	const fenced = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/.exec(trimmed);
	return (fenced?.[1] ?? trimmed).trim();
}

const ollamaChatResponseSchema = z.object({
	message: z.object({ content: z.string() }),
});

export class DescribeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DescribeError";
	}
}

export interface DescriberOptions {
	baseUrl: string;
	model: string;
	fetchFn?: typeof fetch;
}

export interface Describer {
	/** Devuelve una versión mejorada en markdown del texto recibido. */
	improve(text: string): Promise<string>;
}

export class OllamaDescriber implements Describer {
	constructor(private readonly options: DescriberOptions) {}

	async improve(text: string): Promise<string> {
		const { baseUrl, model, fetchFn = fetch } = this.options;

		const response = await fetchFn(`${baseUrl}/api/chat`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: buildSystemPrompt() },
					{ role: "user", content: text },
				],
				stream: false,
				options: { temperature: 0.3 },
			}),
		});
		if (!response.ok) {
			throw new DescribeError(`Ollama respondió ${response.status}`);
		}

		const payload = ollamaChatResponseSchema.parse(await response.json());
		const improved = stripCodeFence(payload.message.content);
		if (improved.length === 0) {
			throw new DescribeError("la IA devolvió una descripción vacía");
		}
		return improved.slice(0, MAX_OUTPUT_CHARS);
	}
}
