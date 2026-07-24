import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createDbClient } from "./db/client.js";
import { migrateUp } from "./db/migrations.js";
import { migrations } from "./db/migrations/index.js";

const env = loadEnv();
const db = await createDbClient(env.DATABASE_URL);
const app = buildApp({ logger: env.NODE_ENV !== "test", db });

// Migraciones al arrancar: app self-hosted, sin paso de deploy separado.
const applied = await migrateUp(db, migrations, {
	log: (message) => app.log.info(message),
});
if (applied.length > 0) {
	app.log.info(`migraciones aplicadas: ${applied.join(", ")}`);
}

try {
	await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
