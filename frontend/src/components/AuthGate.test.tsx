import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UNAUTHORIZED_EVENT } from "../api/client.js";
import { AuthGate } from "./AuthGate.js";

function renderGate() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const view = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return render(
		view({
			children: (
				<AuthGate>
					<div>CONTENIDO PRIVADO</div>
				</AuthGate>
			),
		}),
	);
}

function session(body: unknown) {
	return vi.fn().mockResolvedValue(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		}),
	);
}

afterEach(() => {
	// Vitest corre sin `globals`, así que la limpieza de RTL es explícita.
	cleanup();
	vi.unstubAllGlobals();
});

describe("AuthGate", () => {
	it("muestra el login cuando no hay sesión", async () => {
		vi.stubGlobal(
			"fetch",
			session({ auth_enabled: true, authenticated: false, username: null }),
		);

		renderGate();

		expect(await screen.findByLabelText(/contraseña/i)).toBeDefined();
		expect(screen.queryByText("CONTENIDO PRIVADO")).toBeNull();
	});

	it("monta la app cuando la sesión es válida", async () => {
		vi.stubGlobal(
			"fetch",
			session({ auth_enabled: true, authenticated: true, username: "poio" }),
		);

		renderGate();

		expect(await screen.findByText("CONTENIDO PRIVADO")).toBeDefined();
	});

	it("deja pasar cuando el backend corre sin autenticación", async () => {
		vi.stubGlobal(
			"fetch",
			session({ auth_enabled: false, authenticated: true, username: null }),
		);

		renderGate();

		expect(await screen.findByText("CONTENIDO PRIVADO")).toBeDefined();
	});

	it("vuelve al login si una petición responde 401 (sesión caducada)", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						auth_enabled: true,
						authenticated: true,
						username: "poio",
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
			)
			.mockResolvedValue(
				new Response(
					JSON.stringify({
						auth_enabled: true,
						authenticated: false,
						username: null,
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		renderGate();
		await screen.findByText("CONTENIDO PRIVADO");

		fireEvent(window, new Event(UNAUTHORIZED_EVENT));

		await waitFor(() =>
			expect(screen.queryByText("CONTENIDO PRIVADO")).toBeNull(),
		);
		expect(screen.getByLabelText(/contraseña/i)).toBeDefined();
	});
});
