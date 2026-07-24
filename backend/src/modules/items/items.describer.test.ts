import { describe, expect, it, vi } from "vitest";
import { DescribeError, OllamaDescriber } from "./items.describer.js";

function ollamaResponse(content: string): Response {
	return new Response(JSON.stringify({ message: { content } }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

function makeDescriber(fetchFn: typeof fetch) {
	return new OllamaDescriber({
		baseUrl: "http://ollama.test",
		model: "gemma4:latest",
		fetchFn,
	});
}

describe("OllamaDescriber.improve", () => {
	it("devuelve el markdown de la IA tal cual", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(ollamaResponse("## Objetivo\n- [ ] paso 1"));
		const result = await makeDescriber(
			fetchFn as unknown as typeof fetch,
		).improve("hazme una lista");
		expect(result).toBe("## Objetivo\n- [ ] paso 1");
	});

	it("quita el bloque de código si la IA envuelve la salida", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(ollamaResponse("```markdown\n# Título\ntexto\n```"));
		const result = await makeDescriber(
			fetchFn as unknown as typeof fetch,
		).improve("x");
		expect(result).toBe("# Título\ntexto");
	});

	it("lanza DescribeError si Ollama responde con error HTTP", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(new Response("boom", { status: 500 }));
		await expect(
			makeDescriber(fetchFn as unknown as typeof fetch).improve("x"),
		).rejects.toThrow(DescribeError);
	});

	it("lanza DescribeError si la IA devuelve una descripción vacía", async () => {
		const fetchFn = vi.fn().mockResolvedValue(ollamaResponse("   \n  "));
		await expect(
			makeDescriber(fetchFn as unknown as typeof fetch).improve("x"),
		).rejects.toThrow(/vacía/);
	});
});
