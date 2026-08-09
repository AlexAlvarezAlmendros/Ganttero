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
): Promise<Client> {
	if (url.startsWith("file:")) {
		// SQLite no crea directorios: sin esto, ./data/ inexistente = error 14.
		await mkdir(dirname(url.slice("file:".length)), { recursive: true });
	}
	const db = createClient({ url, ...(authToken ? { authToken } : {}) });
	// En Turso el PRAGMA viaja como cualquier sentencia y la conexión es HTTP:
	// se aplica igual, pero aquí es además el primer ping que valida la URL.
	await db.execute("PRAGMA foreign_keys = ON");
	return db;
}

export type { Client };
