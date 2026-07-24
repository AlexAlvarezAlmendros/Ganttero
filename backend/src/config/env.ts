import { z } from "zod";

/**
 * Única puerta de entrada a las variables de entorno (regla de CLAUDE.md:
 * nunca `process.env` directo fuera de este módulo). `loadEnv` recibe la
 * fuente inyectada para poder testearse sin tocar el entorno real.
 */

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	HOST: z.string().min(1).default("0.0.0.0"),
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	/** URL libSQL: `file:...` (fichero, en prod montado desde el NAS) o `ws://host:8080` (sqld). */
	DATABASE_URL: z.string().min(1).default("file:./data/ganttero.db"),
	/** Ollama del homeserver para la captura por voz (Fase 5). */
	OLLAMA_BASE_URL: z
		.string()
		.regex(/^https?:\/\/.+/, "debe ser una URL http(s)")
		.default("http://localhost:11434"),
	OLLAMA_MODEL: z.string().min(1).default("gemma4:latest"),
	/** STT local (Fase 5): intérprete Python del venv y script faster-whisper. */
	STT_PYTHON: z.string().min(1).default("./stt/.venv/bin/python"),
	STT_SCRIPT: z.string().min(1).default("./stt/stt.py"),
	STT_MODEL: z.string().min(1).default("small"),
	/** Carpeta de audios retenidos (en prod, montada desde el NAS). */
	AUDIO_DIR: z.string().min(1).default("./data/audios"),
	/** Token de GitHub con scope mínimo (Fase 6). Nunca loggearlo. */
	GITHUB_TOKEN: z.string().min(1).optional(),
	/** Polling de smart commits en segundos; 0 = desactivado. */
	GITHUB_POLL_SECONDS: z.coerce.number().int().min(0).max(86_400).default(300),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
	const parsed = envSchema.safeParse(source);
	if (!parsed.success) {
		// Solo nombres de variable y motivo: jamás volcar valores al error/log.
		const issues = parsed.error.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("; ");
		throw new Error(`configuración de entorno inválida — ${issues}`);
	}
	return parsed.data;
}
