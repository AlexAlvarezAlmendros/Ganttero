/** Errores de dominio: los services los lanzan, el error handler HTTP los mapea. */

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export class ConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConflictError";
	}
}

export class DomainError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DomainError";
	}
}

/** Sin sesión válida (Fase 9). Mapea a 401. */
export class UnauthorizedError extends Error {
	constructor(message = "no autenticado") {
		super(message);
		this.name = "UnauthorizedError";
	}
}

/** Demasiados intentos de login (Fase 9). Mapea a 429 con `Retry-After`. */
export class TooManyRequestsError extends Error {
	constructor(
		message: string,
		readonly retryAfterSeconds: number,
	) {
		super(message);
		this.name = "TooManyRequestsError";
	}
}
