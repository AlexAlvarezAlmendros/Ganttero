import { SESSION_COOKIE } from "./auth.schema.js";

/**
 * Cookie de sesión a mano: el token es base64url + `.` (charset seguro en una
 * cookie), así que no hace falta un plugin de parseo — y evitamos depender del
 * orden de carga de plugins en el hook global de autenticación.
 *
 * Atributos: `HttpOnly` (el JS de la página nunca la lee), `SameSite=Lax` (el
 * navegador no la manda en peticiones cross-site: protege de CSRF en los POST)
 * y `Path=/`. `Secure` es configurable porque en la LAN se sirve por HTTP y,
 * con `Secure`, el navegador descartaría la cookie.
 */

export interface CookieOptions {
	secure: boolean;
	maxAgeSeconds: number;
}

export function readSessionCookie(
	cookieHeader: string | undefined,
): string | undefined {
	if (!cookieHeader) {
		return undefined;
	}
	for (const part of cookieHeader.split(";")) {
		const separator = part.indexOf("=");
		if (separator === -1) {
			continue;
		}
		if (part.slice(0, separator).trim() === SESSION_COOKIE) {
			return part.slice(separator + 1).trim();
		}
	}
	return undefined;
}

export function serializeSessionCookie(
	token: string,
	options: CookieOptions,
): string {
	const attributes = [
		`${SESSION_COOKIE}=${token}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${options.maxAgeSeconds}`,
	];
	if (options.secure) {
		attributes.push("Secure");
	}
	return attributes.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
	return serializeSessionCookie("", { secure, maxAgeSeconds: 0 });
}
