import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useImproveDescription } from "./items.js";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useImproveDescription", () => {
	it("envía el texto a /api/items/improve-description y devuelve el markdown", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ improved: "## Mejorada\n- [ ] paso" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useImproveDescription(), { wrapper });
		const response = await result.current.mutateAsync("texto suelto");

		expect(response.improved).toBe("## Mejorada\n- [ ] paso");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/items/improve-description",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ text: "texto suelto" }),
			}),
		);
	});

	it("propaga el error de la IA para que la UI conserve el texto original", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: "la IA no pudo mejorar" }), {
					status: 422,
					headers: { "content-type": "application/json" },
				}),
			),
		);

		const { result } = renderHook(() => useImproveDescription(), { wrapper });

		await expect(result.current.mutateAsync("x")).rejects.toThrow();
		await waitFor(() => expect(result.current.isError).toBe(true));
	});
});
