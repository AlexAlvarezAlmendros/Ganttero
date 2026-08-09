/** Cliente HTTP mínimo: mismo origen, prefijo /api (proxy de Vite en dev). */

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

/**
 * Aviso de sesión caducada: cualquier 401 lo emite y el gate de autenticación
 * lo escucha para volver al login sin que cada hook tenga que enterarse.
 */
export const UNAUTHORIZED_EVENT = "ganttero:unauthorized";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	// `same-origin` explícito: la cookie de sesión viaja, nada más.
	const response = await fetch(`/api${path}`, {
		credentials: "same-origin",
		...init,
	});
	if (!response.ok) {
		if (response.status === 401 && !path.startsWith("/auth/")) {
			window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
		}
		let detail = `${init?.method ?? "GET"} ${path} → ${response.status}`;
		try {
			const body = (await response.json()) as { error?: string };
			if (body.error) detail = body.error;
		} catch {
			// sin cuerpo JSON: nos quedamos con el detalle genérico
		}
		throw new ApiError(response.status, detail);
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
	return request<T>(path);
}

export function apiSend<T>(
	method: "POST" | "PATCH" | "DELETE",
	path: string,
	body?: unknown,
): Promise<T> {
	return request<T>(path, {
		method,
		...(body !== undefined
			? {
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				}
			: {}),
	});
}
