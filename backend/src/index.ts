import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createDbClient } from "./db/client.js";
import { migrateUp } from "./db/migrations.js";
import { migrations } from "./db/migrations/index.js";
import { VoiceService } from "./modules/voice/voice.service.js";
import { OllamaStructurer } from "./modules/voice/voice.structurer.js";
import { PythonStt } from "./modules/voice/voice.stt.js";

const env = loadEnv();
const db = await createDbClient(env.DATABASE_URL);
const voiceService = new VoiceService(
	new PythonStt({
		pythonBin: env.STT_PYTHON,
		scriptPath: env.STT_SCRIPT,
		model: env.STT_MODEL,
	}),
	new OllamaStructurer({
		baseUrl: env.OLLAMA_BASE_URL,
		model: env.OLLAMA_MODEL,
	}),
);
const app = buildApp({
	logger: env.NODE_ENV !== "test",
	db,
	voice: { service: voiceService, audioDir: env.AUDIO_DIR },
});

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
