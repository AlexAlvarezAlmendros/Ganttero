import { type Client, createClient } from "@libsql/client";

/**
 * Cliente libSQL. La URL llega inyectada (desde `config/env.ts` en el
 * arranque real, `:memory:` en tests): este módulo no lee el entorno.
 * `file:...` → fichero local/NAS · `ws://host:8080` → sqld remoto.
 *
 * Async porque SQLite exige activar las foreign keys por conexión
 * (`PRAGMA foreign_keys`), y el modelo depende de sus ON DELETE CASCADE.
 */
export async function createDbClient(url: string): Promise<Client> {
	const db = createClient({ url });
	await db.execute("PRAGMA foreign_keys = ON");
	return db;
}

export type { Client };
