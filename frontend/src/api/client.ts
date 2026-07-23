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

export async function apiGet<T>(path: string): Promise<T> {
	const response = await fetch(`/api${path}`);
	if (!response.ok) {
		throw new ApiError(response.status, `GET ${path} → ${response.status}`);
	}
	return (await response.json()) as T;
}
