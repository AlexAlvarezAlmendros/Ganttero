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
