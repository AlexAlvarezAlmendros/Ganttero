import { z } from "zod";
import { isValidPasswordHash } from "../modules/auth/auth.password.js";

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
	/**
	 * Token bearer del endpoint MCP (Fase 14). Sin él, el módulo no se registra
	 * y la ruta no existe: los agentes se habilitan explícitamente, nunca por
	 * defecto. Genera uno con `openssl rand -hex 32`.
	 */
	MCP_TOKEN: z.string().min(32, "usa al menos 32 caracteres").optional(),
	/** Autenticación (Fase 9): usuario único. Obligatorias en producción. */
	AUTH_USERNAME: z.string().min(1).optional(),
	/** Hash scrypt generado con `pnpm --filter backend auth:hash`. */
	AUTH_PASSWORD_HASH: z
		.string()
		.refine(isValidPasswordHash, "no tiene formato scrypt$N$r$p$salt$hash")
		.optional(),
	/** Secreto de firma de la sesión (`openssl rand -hex 32`). Rotarlo cierra sesiones. */
	AUTH_SECRET: z.string().min(32, "usa al menos 32 caracteres").optional(),
	/** Duración de la sesión en días. */
	AUTH_SESSION_DAYS: z.coerce.number().min(0.01).max(365).default(30),
	/**
	 * `Secure` en la cookie: solo si se sirve por HTTPS. En la LAN (HTTP) debe
	 * quedar en `false` o el navegador descartaría la cookie y no habría login.
	 */
	AUTH_COOKIE_SECURE: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
});

/** Variables que definen al usuario: o están las tres, o no está ninguna. */
const AUTH_KEYS = [
	"AUTH_USERNAME",
	"AUTH_PASSWORD_HASH",
	"AUTH_SECRET",
] as const;

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
	const env = parsed.data;

	// Reglas cruzadas de la auth: en producción no se despliega sin login, y a
	// medias tampoco se arranca (media configuración = falsa sensación de seguridad).
	const missing = AUTH_KEYS.filter((key) => env[key] === undefined);
	if (missing.length > 0 && missing.length < AUTH_KEYS.length) {
		throw new Error(
			`configuración de entorno inválida — autenticación incompleta, faltan: ${missing.join(", ")}`,
		);
	}
	if (missing.length === AUTH_KEYS.length && env.NODE_ENV === "production") {
		throw new Error(
			`configuración de entorno inválida — en producción son obligatorias: ${AUTH_KEYS.join(", ")}`,
		);
	}
	return env;
}

export interface AuthEnvConfig {
	username: string;
	passwordHash: string;
	secret: string;
	sessionDays: number;
	cookieSecure: boolean;
}

/** Config de auth lista para el service, o `null` si la app corre sin login. */
export function authConfigFromEnv(env: Env): AuthEnvConfig | null {
	if (
		env.AUTH_USERNAME === undefined ||
		env.AUTH_PASSWORD_HASH === undefined ||
		env.AUTH_SECRET === undefined
	) {
		return null;
	}
	return {
		username: env.AUTH_USERNAME,
		passwordHash: env.AUTH_PASSWORD_HASH,
		secret: env.AUTH_SECRET,
		sessionDays: env.AUTH_SESSION_DAYS,
		cookieSecure: env.AUTH_COOKIE_SECURE,
	};
}
