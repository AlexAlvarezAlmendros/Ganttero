import { loadEnv } from "../config/env.js";
import { createDbClient } from "./client.js";
import { migrateDown, migrateUp } from "./migrations.js";
import { migrations } from "./migrations/index.js";

/**
 * CLI de migraciones:
 *   pnpm --filter backend db:migrate          (up: aplica pendientes)
 *   pnpm --filter backend db:rollback [n]     (down: revierte n, def. 1)
 */

const command = process.argv[2];
const env = loadEnv();
const db = createDbClient(env.DATABASE_URL);
const log = (message: string) => console.log(message);

if (command === "up") {
	const applied = await migrateUp(db, migrations, { log });
	console.log(
		applied.length === 0
			? "sin migraciones pendientes"
			: `aplicadas: ${applied.length}`,
	);
} else if (command === "down") {
	const steps = Number(process.argv[3] ?? "1");
	const reverted = await migrateDown(db, migrations, steps, { log });
	console.log(
		reverted.length === 0
			? "nada que revertir"
			: `revertidas: ${reverted.length}`,
	);
} else {
	console.error("uso: migrate.ts <up|down> [steps]");
	process.exit(2);
}
