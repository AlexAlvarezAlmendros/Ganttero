import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useItems } from "./items.js";
import { useKanban } from "./kanban.js";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function stubFetch(body: unknown) {
	const fetchMock = vi.fn().mockResolvedValue(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		}),
	);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ámbito del proyecto activo", () => {
	it("useItems con un id pide el listado de ese proyecto", async () => {
		const fetchMock = stubFetch([]);
		const { result } = renderHook(() => useItems(3), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/projects/3/items",
			expect.anything(),
		);
	});

	it('useItems con "all" pide el trabajo de todos los proyectos', async () => {
		const fetchMock = stubFetch([]);
		const { result } = renderHook(() => useItems("all"), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith("/api/items", expect.anything());
	});

	it("useKanban con un id pide el tablero de ese proyecto", async () => {
		const fetchMock = stubFetch({ project_id: 3, columns: {} });
		const { result } = renderHook(() => useKanban(3), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/projects/3/kanban",
			expect.anything(),
		);
	});

	it('useKanban con "all" pide el tablero agregado', async () => {
		const fetchMock = stubFetch({ project_id: null, columns: {} });
		const { result } = renderHook(() => useKanban("all"), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith("/api/kanban", expect.anything());
	});

	it("sin ámbito no se pide nada", () => {
		const fetchMock = stubFetch([]);
		renderHook(() => useItems(null), { wrapper });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
