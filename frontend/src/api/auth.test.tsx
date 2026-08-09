import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLogin, useLogout, useSession } from "./auth.js";
import { ApiError, UNAUTHORIZED_EVENT, apiGet } from "./client.js";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useSession", () => {
	it("lee el estado de la sesión de /api/auth/session", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				jsonResponse({
					auth_enabled: true,
					authenticated: true,
					username: "poio",
				}),
			),
		);

		const { result } = renderHook(() => useSession(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.username).toBe("poio");
	});
});

describe("useLogin", () => {
	it("envía las credenciales por POST", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ authenticated: true, username: "poio" }),
			);
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useLogin(), { wrapper });
		await result.current.mutateAsync({ username: "poio", password: "secreta" });

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/auth/login",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ username: "poio", password: "secreta" }),
				credentials: "same-origin",
			}),
		);
	});

	it("propaga el mensaje del backend cuando las credenciales fallan", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					jsonResponse({ error: "usuario o contraseña incorrectos" }, 401),
				),
		);

		const { result } = renderHook(() => useLogin(), { wrapper });
		const error = await result.current
			.mutateAsync({ username: "poio", password: "mala" })
			.catch((thrown: unknown) => thrown);

		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(401);
		expect((error as ApiError).message).toBe(
			"usuario o contraseña incorrectos",
		);
	});
});

describe("useLogout", () => {
	it("llama a /api/auth/logout", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useLogout(), { wrapper });
		await result.current.mutateAsync();

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/auth/logout",
			expect.objectContaining({ method: "POST" }),
		);
	});
});

describe("cliente HTTP", () => {
	it("emite el aviso de sesión caducada ante un 401 de datos", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse({ error: "no autenticado" }, 401)),
		);
		const listener = vi.fn();
		window.addEventListener(UNAUTHORIZED_EVENT, listener);

		await expect(apiGet("/projects")).rejects.toBeInstanceOf(ApiError);

		expect(listener).toHaveBeenCalledOnce();
		window.removeEventListener(UNAUTHORIZED_EVENT, listener);
	});

	it("no lo emite en las propias rutas de login (el error se enseña en el formulario)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse({ error: "credenciales" }, 401)),
		);
		const listener = vi.fn();
		window.addEventListener(UNAUTHORIZED_EVENT, listener);

		await expect(apiGet("/auth/session")).rejects.toBeInstanceOf(ApiError);

		expect(listener).not.toHaveBeenCalled();
		window.removeEventListener(UNAUTHORIZED_EVENT, listener);
	});
});
