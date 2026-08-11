import { writeSync } from "node:fs";
import { buildApp } from "./build-app.js";
import { authConfigFromEnv, loadEnv } from "./config/env.js";
import { createDbClient } from "./db/client.js";
import { migrateUp } from "./db/migrations.js";
import { migrations } from "./db/migrations/index.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { RealGitHubClient } from "./modules/github/github.client.js";
import type { GithubService } from "./modules/github/github.service.js";
import { OllamaDescriber } from "./modules/items/items.describer.js";
import { VoiceService } from "./modules/voice/voice.service.js";
import { OllamaStructurer } from "./modules/voice/voice.structurer.js";
import { PythonStt } from "./modules/voice/voice.stt.js";

/**
 * Traza del arranque. En serverless cada petición puede pagar un arranque en
 * frío y, si algo se cuelga antes de `listen()`, la plataforma devuelve un 500
 * sin una sola línea nuestra: sin estas marcas el fallo es invisible.
 */
const bootedAt = Date.now();
/**
 * `writeSync` sobre el descriptor 1, no `console.info`: la salida por consola
 * va a un pipe y queda bufferizada, así que si la plataforma mata el proceso
 * por tiempo (que es justo el caso que queremos diagnosticar) esas líneas no
 * llegan a escribirse nunca. Esto sí sobrevive.
 */
const step = (name: string) => {
	writeSync(1, `[boot +${Date.now() - bootedAt}ms] ${name}\n`);
};

step("cargando configuración");
const env = loadEnv();
step(
	`configuración ok · db=${env.DATABASE_URL.split(":")[0]} · voz=${env.VOICE_ENABLED}`,
);

step("conectando a la base de datos");
const db = await createDbClient(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
step("base de datos conectada");
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
// Auth (Fase 9): en producción `loadEnv` ya garantiza que existe la config.
const authConfig = authConfigFromEnv(env);
const app = buildApp({
	logger: env.NODE_ENV !== "test",
	db,
	describer,
	...(authConfig
		? {
				auth: {
					service: new AuthService({
						username: authConfig.username,
						passwordHash: authConfig.passwordHash,
						secret: authConfig.secret,
						sessionDays: authConfig.sessionDays,
					}),
					cookieSecure: authConfig.cookieSecure,
				},
			}
		: {}),
	// MCP (Fase 14): solo si hay token. Sin él la ruta no existe.
	...(env.MCP_TOKEN ? { mcp: { token: env.MCP_TOKEN } } : {}),
	// La voz necesita Python + ffmpeg + Ollama: en serverless no se registra.
	...(env.VOICE_ENABLED
		? { voice: { service: voiceService, audioDir: env.AUDIO_DIR } }
		: {}),
	github: {
		client: new RealGitHubClient(env.GITHUB_TOKEN),
		status: {
			token_configured: env.GITHUB_TOKEN !== undefined,
			poll_seconds: env.GITHUB_POLL_SECONDS,
		},
	},
});

if (!env.VOICE_ENABLED) {
	app.log.info("captura por voz desactivada (VOICE_ENABLED=false)");
}

if (!authConfig) {
	app.log.warn(
		"AUTENTICACIÓN DESACTIVADA: la API responde sin login. Define AUTH_USERNAME, AUTH_PASSWORD_HASH y AUTH_SECRET.",
	);
}

// Migraciones al arrancar: pensado para el self-hosted, donde el proceso vive
// y esto se paga una vez. En serverless cada arranque en frío las repetiría
// ANTES de escuchar, y una tanda de idas y venidas a la base remota se come el
// presupuesto de la petición: la plataforma corta y la API no responde nunca.
// Allí se aplican una sola vez, a mano: `pnpm --filter backend db:migrate`.
if (env.MIGRATE_ON_BOOT) {
	step("aplicando migraciones");
	const applied = await migrateUp(db, migrations, {
		log: (message) => app.log.info(message),
	});
	step(
		`migraciones al día${applied.length > 0 ? `: ${applied.join(", ")}` : ""}`,
	);
} else {
	step("migraciones omitidas (se aplican con db:migrate)");
}

try {
	await app.listen({ port: env.PORT, host: env.HOST });
	step(`escuchando en ${env.HOST}:${env.PORT}`);
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
