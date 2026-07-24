import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createDbClient } from "./db/client.js";
import { migrateUp } from "./db/migrations.js";
import { migrations } from "./db/migrations/index.js";
import { RealGitHubClient } from "./modules/github/github.client.js";
import type { GithubService } from "./modules/github/github.service.js";
import { OllamaDescriber } from "./modules/items/items.describer.js";
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
const describer = new OllamaDescriber({
	baseUrl: env.OLLAMA_BASE_URL,
	model: env.OLLAMA_MODEL,
});
const app = buildApp({
	logger: env.NODE_ENV !== "test",
	db,
	describer,
	voice: { service: voiceService, audioDir: env.AUDIO_DIR },
	github: {
		client: new RealGitHubClient(env.GITHUB_TOKEN),
		status: {
			token_configured: env.GITHUB_TOKEN !== undefined,
			poll_seconds: env.GITHUB_POLL_SECONDS,
		},
	},
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

// Polling de smart commits (decisión Fase 6: polling, no webhook).
if (env.GITHUB_POLL_SECONDS > 0) {
	const github = (app as unknown as { githubService: GithubService })
		.githubService;
	const poll = async () => {
		try {
			const result = await github.scanSmartCommits();
			if (result.linked > 0 || result.closed > 0) {
				app.log.info(
					`github: ${result.linked} commits enlazados, ${result.closed} tareas cerradas`,
				);
			}
		} catch (error) {
			app.log.warn(`github: escaneo fallido (${(error as Error).message})`);
		}
	};
	setInterval(poll, env.GITHUB_POLL_SECONDS * 1000);
	void poll();
}
