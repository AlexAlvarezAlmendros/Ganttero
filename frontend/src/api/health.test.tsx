import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHealth } from "./health.js";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useHealth", () => {
	it("devuelve el estado del backend vía /api/health", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ status: "ok" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useHealth(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual({ status: "ok" });
		expect(fetchMock).toHaveBeenCalledWith("/api/health");
	});

	it("marca error si el backend no responde", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("nope", { status: 503 })),
		);

		const { result } = renderHook(() => useHealth(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
	});
});
