import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage.js";

function renderLogin() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<LoginPage />
		</QueryClientProvider>,
	);
}

function fill(username: string, password: string) {
	fireEvent.change(screen.getByLabelText(/usuario/i), {
		target: { value: username },
	});
	fireEvent.change(screen.getByLabelText(/contraseña/i), {
		target: { value: password },
	});
}

afterEach(() => {
	// Vitest corre sin `globals`, así que la limpieza de RTL es explícita.
	cleanup();
	vi.unstubAllGlobals();
});

describe("LoginPage", () => {
	it("envía usuario y contraseña al backend", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ authenticated: true, username: "poio" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		renderLogin();
		fill("poio", "secreta");
		fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

		await vi.waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/auth/login",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ username: "poio", password: "secreta" }),
				}),
			),
		);
	});

	it("muestra el error del backend sin decir qué campo falla", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(
						JSON.stringify({ error: "usuario o contraseña incorrectos" }),
						{ status: 401, headers: { "content-type": "application/json" } },
					),
				),
		);

		renderLogin();
		fill("poio", "mala");
		fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("usuario o contraseña incorrectos");
	});

	it("no deja enviar con campos vacíos", () => {
		renderLogin();

		const submit = screen.getByRole("button", { name: /entrar/i });
		expect(submit.hasAttribute("disabled")).toBe(true);

		fill("poio", "algo");
		expect(submit.hasAttribute("disabled")).toBe(false);
	});

	it("la contraseña no se escribe en claro en el DOM", () => {
		renderLogin();
		fill("poio", "secreta");

		expect(screen.getByLabelText(/contraseña/i).getAttribute("type")).toBe(
			"password",
		);
	});
});
