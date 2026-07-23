import { describe, expect, it, vi } from "vitest";
import { StructureError, structureTranscript } from "./structure.js";

const validItem = {
	title: "Hacer la build de Windows y Linux del plugin",
	type: "task",
	description: null,
	estimate_min: null,
	start_date: null,
	end_date: null,
	dependencies: [],
};

function ollamaReply(content: string): Response {
	return new Response(JSON.stringify({ message: { content } }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("structureTranscript", () => {
	it("devuelve el ítem validado al primer intento", async () => {
		const fetchFn = vi.fn().mockResolvedValue(ollamaReply(JSON.stringify(validItem)));

		const result = await structureTranscript("hay que hacer la build", {
			today: "2026-07-23",
			fetchFn,
		});

		expect(result.item.title).toBe(validItem.title);
		expect(result.attempts).toBe(1);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("inyecta el 'hoy' recibido en el prompt (nunca lo calcula)", async () => {
		const fetchFn = vi.fn().mockResolvedValue(ollamaReply(JSON.stringify(validItem)));

		await structureTranscript("para el viernes", { today: "2031-01-06", fetchFn });

		const body = JSON.parse(fetchFn.mock.calls[0]?.[1]?.body as string);
		expect(body.messages[0].content).toContain("Hoy es 2031-01-06");
		expect(body.options.temperature).toBe(0);
	});

	it("reintenta con el error de Zod como feedback si el JSON no cumple", async () => {
		const invalid = { ...validItem, type: "milestone" };
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(ollamaReply(JSON.stringify(invalid)))
			.mockResolvedValueOnce(ollamaReply(JSON.stringify(validItem)));

		const result = await structureTranscript("hay que hacer la build", {
			today: "2026-07-23",
			fetchFn,
		});

		expect(result.attempts).toBe(2);
		const secondBody = JSON.parse(fetchFn.mock.calls[1]?.[1]?.body as string);
		expect(secondBody.messages).toHaveLength(3);
		expect(secondBody.messages[2].content).toContain("no cumple el contrato");
	});

	it("lanza StructureError al agotar los intentos", async () => {
		const fetchFn = vi.fn().mockImplementation(async () => ollamaReply("esto no es JSON"));

		await expect(
			structureTranscript("hay que hacer la build", {
				today: "2026-07-23",
				maxAttempts: 2,
				fetchFn,
			}),
		).rejects.toThrow(StructureError);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it("lanza si Ollama responde con error HTTP", async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));

		await expect(
			structureTranscript("hay que hacer la build", {
				today: "2026-07-23",
				fetchFn,
			}),
		).rejects.toThrow("Ollama respondió 500");
	});
});
