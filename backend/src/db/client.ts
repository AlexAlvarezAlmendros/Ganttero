import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { type Client, createClient } from "@libsql/client";

/**
 * Cliente libSQL. La URL llega inyectada (desde `config/env.ts` en el
 * arranque real, `:memory:` en tests): este módulo no lee el entorno.
 * `file:...` → fichero local/NAS · `ws://host:8080` → sqld self-hosted ·
 * `libsql://...` → Turso gestionado (exige `authToken`).
 *
 * Async porque SQLite exige activar las foreign keys por conexión
 * (`PRAGMA foreign_keys`), y el modelo depende de sus ON DELETE CASCADE.
 */
export async function createDbClient(
	url: string,
	authToken?: string,
	/** Tope del primer ping. Inyectable para no meter esperas en los tests. */
	connectTimeoutMs = 10_000,
): Promise<Client> {
	if (url.startsWith("file:")) {
		const dir = dirname(url.slice("file:".length));
		try {
			// SQLite no crea directorios: sin esto, ./data/ inexistente = error 14.
			await mkdir(dir, { recursive: true });
		} catch (error) {
			// En serverless el disco es de solo lectura salvo /tmp, así que el
			// ENOENT/EROFS pelado no dice nada útil: aquí es que falta configurar
			// una base de datos remota.
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ENOENT" || code === "EROFS" || code === "EACCES") {
				throw new Error(
					`no se puede crear el directorio de la base de datos (${dir}): el sistema de ficheros es de solo lectura. En un despliegue serverless usa Turso — DATABASE_URL=libsql://… y DATABASE_AUTH_TOKEN`,
					{ cause: error },
				);
			}
			throw error;
		}
	}
	const db = createClient({ url, ...(authToken ? { authToken } : {}) });
	// En Turso el PRAGMA viaja como cualquier sentencia y la conexión es HTTP:
	// se aplica igual, pero aquí es además el primer ping que valida la URL.
	// Con tope: si la base remota no contesta, en serverless el arranque se
	// come el presupuesto de la petición y la plataforma devuelve un 500 sin
	// una sola línea de log. Mejor fallar pronto y diciendo qué pasa.
	await withTimeout(
		db.execute("PRAGMA foreign_keys = ON"),
		connectTimeoutMs,
		`la base de datos no respondió en ${connectTimeoutMs} ms (${redactUrl(url)}). Revisa DATABASE_URL/DATABASE_AUTH_TOKEN y que la base exista`,
	);
	return db;
}

/** Host de la URL, sin credenciales ni ruta: seguro para logs y errores. */
function redactUrl(url: string): string {
	try {
		return new URL(url).host || url.split(":")[0] || "?";
	} catch {
		return url.split(":")[0] ?? "?";
	}
}

async function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	message: string,
): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => reject(new Error(message)), ms);
			}),
		]);
	} finally {
		// Sin esto el temporizador mantendría vivo el proceso hasta que venza.
		if (timer) clearTimeout(timer);
	}
}

export type { Client };
