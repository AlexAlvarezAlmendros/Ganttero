import { buildApp } from "./app.js";

// Puerto y host fijos hasta la tarea 1.2 (config/env.ts con Zod).
const app = buildApp({ logger: true });

try {
	await app.listen({ port: 3000, host: "0.0.0.0" });
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
