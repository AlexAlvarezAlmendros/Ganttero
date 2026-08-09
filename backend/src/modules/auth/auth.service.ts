import { createHmac, timingSafeEqual } from "node:crypto";
import { TooManyRequestsError, UnauthorizedError } from "../../lib/errors.js";
import { verifyPassword } from "./auth.password.js";

/**
 * Lógica de sesión de un solo usuario: no sabe de HTTP ni de SQL.
 *
 * La sesión es un token firmado (HMAC-SHA256 con `AUTH_SECRET`) que el backend
 * no almacena: `payload.firma`, con el usuario y la caducidad dentro. Rotar el
 * secreto invalida todas las sesiones vivas — es el "cerrar sesión en todas
 * partes" de una app de un solo usuario.
 */

export interface AuthConfig {
	username: string;
	/** Hash scrypt (`scrypt$N$r$p$salt$hash`) — jamás la contraseña en claro. */
	passwordHash: string;
	/** Secreto de firma de la sesión; rotarlo cierra las sesiones abiertas. */
	secret: string;
	sessionDays: number;
}

interface SessionPayload {
	/** Usuario de la sesión. */
	u: string;
	/** Caducidad en epoch ms (UTC). */
	exp: number;
}

interface Attempts {
	failures: number;
	lockedUntilMs: number;
}

/** A partir de aquí cada fallo bloquea, doblando la espera. */
const FREE_ATTEMPTS = 5;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 15 * 60;
/** Se olvida el historial de una IP tras una hora sin intentos. */
const ATTEMPT_TTL_MS = 60 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 1_000;

function base64url(input: Buffer | string): string {
	return Buffer.from(input).toString("base64url");
}

export class AuthService {
	/** Estado en memoria: un solo proceso, un solo usuario; reiniciar lo limpia. */
	private readonly attempts = new Map<
		string,
		Attempts & { lastSeenMs: number }
	>();

	constructor(
		private readonly config: AuthConfig,
		private readonly now: () => Date = () => new Date(),
	) {}

	get username(): string {
		return this.config.username;
	}

	get sessionMaxAgeSeconds(): number {
		return Math.round(this.config.sessionDays * 24 * 60 * 60);
	}

	/**
	 * Verifica credenciales y devuelve el token de sesión.
	 * @param clientKey identificador del cliente para el rate limit (IP).
	 */
	async login(
		username: string,
		password: string,
		clientKey: string,
	): Promise<string> {
		this.assertNotLocked(clientKey);

		// Siempre se calcula el scrypt, aunque el usuario no cuadre: así el
		// tiempo de respuesta no delata si el nombre de usuario existe.
		const passwordOk = await verifyPassword(password, this.config.passwordHash);
		const userOk = safeEqualStrings(username, this.config.username);
		if (!userOk || !passwordOk) {
			this.registerFailure(clientKey);
			throw new UnauthorizedError("usuario o contraseña incorrectos");
		}

		this.attempts.delete(clientKey);
		return this.issueToken();
	}

	/** Token de sesión firmado; caduca a los `sessionDays`. */
	issueToken(): string {
		const expiresAtMs =
			this.now().getTime() + this.sessionMaxAgeSeconds * 1_000;
		const payload: SessionPayload = {
			u: this.config.username,
			exp: expiresAtMs,
		};
		const encoded = base64url(JSON.stringify(payload));
		return `${encoded}.${this.sign(encoded)}`;
	}

	/** Usuario de la sesión, o `null` si el token falta, está manipulado o caducó. */
	verifyToken(token: string | undefined): string | null {
		if (!token) {
			return null;
		}
		const separator = token.lastIndexOf(".");
		if (separator <= 0) {
			return null;
		}
		const encoded = token.slice(0, separator);
		const signature = token.slice(separator + 1);
		if (!safeEqualStrings(signature, this.sign(encoded))) {
			return null;
		}
		let payload: SessionPayload;
		try {
			payload = JSON.parse(
				Buffer.from(encoded, "base64url").toString("utf8"),
			) as SessionPayload;
		} catch {
			return null;
		}
		if (typeof payload?.exp !== "number" || typeof payload?.u !== "string") {
			return null;
		}
		if (payload.exp <= this.now().getTime()) {
			return null;
		}
		// El usuario cambió en el `.env`: las sesiones anteriores dejan de valer.
		if (!safeEqualStrings(payload.u, this.config.username)) {
			return null;
		}
		return payload.u;
	}

	private sign(encodedPayload: string): string {
		return createHmac("sha256", this.config.secret)
			.update(encodedPayload)
			.digest("base64url");
	}

	private assertNotLocked(clientKey: string): void {
		const nowMs = this.now().getTime();
		const entry = this.attempts.get(clientKey);
		if (entry && entry.lockedUntilMs > nowMs) {
			const retryAfterSeconds = Math.ceil((entry.lockedUntilMs - nowMs) / 1000);
			throw new TooManyRequestsError(
				`demasiados intentos; reintenta en ${retryAfterSeconds} s`,
				retryAfterSeconds,
			);
		}
	}

	private registerFailure(clientKey: string): void {
		const nowMs = this.now().getTime();
		this.prune(nowMs);
		const entry = this.attempts.get(clientKey);
		const failures = (entry?.failures ?? 0) + 1;
		const over = failures - FREE_ATTEMPTS;
		const lockSeconds =
			over > 0
				? Math.min(BASE_LOCK_SECONDS * 2 ** (over - 1), MAX_LOCK_SECONDS)
				: 0;
		this.attempts.set(clientKey, {
			failures,
			lockedUntilMs: nowMs + lockSeconds * 1_000,
			lastSeenMs: nowMs,
		});
	}

	/** Evita que el mapa crezca sin fin si llegan peticiones de muchas IPs. */
	private prune(nowMs: number): void {
		if (this.attempts.size < MAX_TRACKED_CLIENTS) {
			return;
		}
		for (const [key, entry] of this.attempts) {
			if (
				entry.lastSeenMs + ATTEMPT_TTL_MS < nowMs &&
				entry.lockedUntilMs < nowMs
			) {
				this.attempts.delete(key);
			}
		}
	}
}

/** Igualdad en tiempo constante para cadenas de longitud distinta. */
function safeEqualStrings(a: string, b: string): boolean {
	const bufferA = Buffer.from(a, "utf8");
	const bufferB = Buffer.from(b, "utf8");
	if (bufferA.length !== bufferB.length) {
		// Longitudes distintas: se compara contra sí mismo para no cortocircuitar
		// antes de tiempo, pero el resultado es siempre `false`.
		timingSafeEqual(bufferA, bufferA);
		return false;
	}
	return timingSafeEqual(bufferA, bufferB);
}
