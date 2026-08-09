import {
	type ScryptOptions,
	randomBytes,
	scrypt,
	timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Hash de contraseña con scrypt (`node:crypto`, sin dependencias). El hash vive
 * en el `.env` del homeserver — nunca en la DB ni en el código.
 *
 * Formato: `scrypt$N$r$p$saltBase64$hashBase64`. Los parámetros viajan dentro
 * del propio hash para poder endurecerlos sin invalidar los hashes antiguos.
 */

// `promisify` pierde las sobrecargas de scrypt: se tipa la que usamos.
const scryptAsync = promisify<string, Buffer, number, ScryptOptions, Buffer>(
	scrypt,
);

/** N=16384, r=8, p=1: recomendación clásica de scrypt (~64 MB de coste). */
const DEFAULT_PARAMS = { N: 16_384, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

interface ParsedHash {
	N: number;
	r: number;
	p: number;
	salt: Buffer;
	hash: Buffer;
}

async function derive(
	password: string,
	salt: Buffer,
	params: { N: number; r: number; p: number },
): Promise<Buffer> {
	// `maxmem` explícito: el default de Node (32 MB) se queda corto para N=16384.
	return scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
		...params,
		maxmem: 256 * 1024 * 1024,
	});
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH);
	const hash = await derive(password, salt, DEFAULT_PARAMS);
	const { N, r, p } = DEFAULT_PARAMS;
	return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function parseHash(stored: string): ParsedHash | null {
	const parts = stored.split("$");
	if (parts.length !== 6 || parts[0] !== "scrypt") {
		return null;
	}
	const [, rawN, rawR, rawP, rawSalt, rawHash] = parts as [
		string,
		string,
		string,
		string,
		string,
		string,
	];
	const N = Number(rawN);
	const r = Number(rawR);
	const p = Number(rawP);
	if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
		return null;
	}
	const salt = Buffer.from(rawSalt, "base64");
	const hash = Buffer.from(rawHash, "base64");
	if (salt.length === 0 || hash.length === 0) {
		return null;
	}
	return { N, r, p, salt, hash };
}

/** ¿Tiene el formato esperado? Se usa al validar el entorno, antes de arrancar. */
export function isValidPasswordHash(stored: string): boolean {
	return parseHash(stored) !== null;
}

/**
 * Comparación en tiempo constante: nunca `===` sobre material secreto.
 * Devuelve `false` (sin lanzar) si el hash almacenado está corrupto.
 */
export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const parsed = parseHash(stored);
	if (!parsed) {
		return false;
	}
	const candidate = await derive(password, parsed.salt, {
		N: parsed.N,
		r: parsed.r,
		p: parsed.p,
	});
	if (candidate.length !== parsed.hash.length) {
		return false;
	}
	return timingSafeEqual(candidate, parsed.hash);
}
