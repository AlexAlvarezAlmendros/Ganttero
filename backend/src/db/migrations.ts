import type { Client } from "./client.js";

/**
 * Runner de migraciones versionadas (patrón up/down) sobre libSQL.
 * Las migraciones viven en `migrations/` como módulos TS con SQL explícito;
 * el registro queda en la tabla `schema_migrations`.
 */

export interface Migration {
	/** Identificador incremental único (001, 002…). */
	id: number;
	name: string;
	up: (db: Client) => Promise<void>;
	down: (db: Client) => Promise<void>;
}

export interface MigrateOptions {
	/** Inyectable para tests; ISO-8601 UTC en la DB. */
	now?: () => Date;
	log?: (message: string) => void;
}

function assertWellFormed(migrations: readonly Migration[]): void {
	const seen = new Set<number>();
	let previous = 0;
	for (const migration of migrations) {
		if (seen.has(migration.id)) {
			throw new Error(`migración duplicada: id ${migration.id}`);
		}
		if (migration.id <= previous) {
			throw new Error(
				`migraciones desordenadas: id ${migration.id} tras ${previous}`,
			);
		}
		seen.add(migration.id);
		previous = migration.id;
	}
}

async function ensureMigrationsTable(db: Client): Promise<void> {
	await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TEXT NOT NULL
	)`);
}

async function appliedIds(db: Client): Promise<Set<number>> {
	const result = await db.execute("SELECT id FROM schema_migrations");
	return new Set(result.rows.map((row) => Number(row["id"])));
}

/** Aplica todas las migraciones pendientes en orden. Devuelve las aplicadas. */
export async function migrateUp(
	db: Client,
	migrations: readonly Migration[],
	options: MigrateOptions = {},
): Promise<string[]> {
	const { now = () => new Date(), log = () => {} } = options;
	assertWellFormed(migrations);
	await ensureMigrationsTable(db);
	const applied = await appliedIds(db);

	const done: string[] = [];
	for (const migration of migrations) {
		if (applied.has(migration.id)) {
			continue;
		}
		await migration.up(db);
		await db.execute({
			sql: "INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)",
			args: [migration.id, migration.name, now().toISOString()],
		});
		log(`↑ ${migration.id} ${migration.name}`);
		done.push(migration.name);
	}
	return done;
}

/** Revierte las últimas `steps` migraciones aplicadas (por defecto 1). */
export async function migrateDown(
	db: Client,
	migrations: readonly Migration[],
	steps = 1,
	options: MigrateOptions = {},
): Promise<string[]> {
	const { log = () => {} } = options;
	assertWellFormed(migrations);
	await ensureMigrationsTable(db);
	const applied = await appliedIds(db);

	const toRevert = migrations
		.filter((migration) => applied.has(migration.id))
		.sort((a, b) => b.id - a.id)
		.slice(0, steps);

	const done: string[] = [];
	for (const migration of toRevert) {
		await migration.down(db);
		await db.execute({
			sql: "DELETE FROM schema_migrations WHERE id = ?",
			args: [migration.id],
		});
		log(`↓ ${migration.id} ${migration.name}`);
		done.push(migration.name);
	}
	return done;
}
