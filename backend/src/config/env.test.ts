import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../modules/auth/auth.password.js";
import { authConfigFromEnv, loadEnv } from "./env.js";

const SECRET = "secreto-de-pruebas-con-mas-de-32-caracteres";
let passwordHash: string;

beforeAll(async () => {
	passwordHash = await hashPassword("contraseña-de-prueba");
});

function authEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return {
		AUTH_USERNAME: "poio",
		AUTH_PASSWORD_HASH: passwordHash,
		AUTH_SECRET: SECRET,
		...extra,
	};
}

describe("loadEnv — Turso y capacidades del despliegue", () => {
	it("exige DATABASE_AUTH_TOKEN cuando la URL es de Turso", () => {
		expect(() =>
			loadEnv({ DATABASE_URL: "libsql://ganttero-poio.turso.io" }),
		).toThrow(/DATABASE_AUTH_TOKEN/);
	});

	it("acepta Turso con su token", () => {
		const env = loadEnv({
			DATABASE_URL: "libsql://ganttero-poio.turso.io",
			DATABASE_AUTH_TOKEN: "un-token-de-turso",
		});
		expect(env.DATABASE_AUTH_TOKEN).toBe("un-token-de-turso");
	});

	it("no exige token al self-hosted (file: y ws:)", () => {
		expect(
			loadEnv({ DATABASE_URL: "file:./data/x.db" }).DATABASE_AUTH_TOKEN,
		).toBeUndefined();
		expect(() => loadEnv({ DATABASE_URL: "ws://nas:8080" })).not.toThrow();
	});

	it("el error de Turso no filtra el valor del token", () => {
		try {
			loadEnv({
				DATABASE_URL: "libsql://ganttero-poio.turso.io",
				DATABASE_AUTH_TOKEN: "",
			});
			expect.unreachable("debería haber lanzado");
		} catch (error) {
			expect((error as Error).message).not.toContain("ganttero-poio");
		}
	});

	it("la voz viene activada y se apaga explícitamente", () => {
		expect(loadEnv({}).VOICE_ENABLED).toBe(true);
		expect(loadEnv({ VOICE_ENABLED: "false" }).VOICE_ENABLED).toBe(false);
	});
});

describe("loadEnv", () => {
	it("aplica los valores por defecto con un entorno vacío", () => {
		const env = loadEnv({});

		expect(env.NODE_ENV).toBe("development");
		expect(env.HOST).toBe("0.0.0.0");
		expect(env.PORT).toBe(3000);
		expect(env.DATABASE_URL).toBe("file:./data/ganttero.db");
		expect(env.OLLAMA_BASE_URL).toBe("http://localhost:11434");
		expect(env.GITHUB_TOKEN).toBeUndefined();
	});

	it("coacciona PORT desde string y valida el rango", () => {
		expect(loadEnv({ PORT: "8080" }).PORT).toBe(8080);
		expect(() => loadEnv({ PORT: "0" })).toThrow(/PORT/);
		expect(() => loadEnv({ PORT: "no-es-un-puerto" })).toThrow(/PORT/);
	});

	it("rechaza NODE_ENV fuera de development/test/production", () => {
		expect(() => loadEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
	});

	it("rechaza OLLAMA_BASE_URL que no sea una URL", () => {
		expect(() => loadEnv({ OLLAMA_BASE_URL: "localhost:11434" })).toThrow(
			/OLLAMA_BASE_URL/,
		);
	});

	it("no incluye valores del entorno en el mensaje de error", () => {
		try {
			loadEnv({ PORT: "secreto-que-no-debe-salir" });
			expect.unreachable("debería haber lanzado");
		} catch (error) {
			expect((error as Error).message).not.toContain(
				"secreto-que-no-debe-salir",
			);
		}
	});

	it("acepta un GITHUB_TOKEN presente sin exigirlo", () => {
		expect(loadEnv({ GITHUB_TOKEN: "ghp_x" }).GITHUB_TOKEN).toBe("ghp_x");
		expect(() => loadEnv({ GITHUB_TOKEN: "" })).toThrow(/GITHUB_TOKEN/);
	});
});

describe("loadEnv — autenticación", () => {
	it("en desarrollo se puede arrancar sin auth", () => {
		expect(authConfigFromEnv(loadEnv({}))).toBeNull();
	});

	it("en producción exige las tres variables de auth", () => {
		expect(() =>
			loadEnv({ NODE_ENV: "production", DATABASE_URL: "file:./x.db" }),
		).toThrow(/AUTH_USERNAME/);
	});

	it("rechaza la auth a medias en cualquier entorno", () => {
		expect(() => loadEnv({ AUTH_USERNAME: "poio" })).toThrow(
			/autenticación incompleta/,
		);
	});

	it("rechaza un hash que no tenga formato scrypt", () => {
		expect(() =>
			loadEnv(authEnv({ AUTH_PASSWORD_HASH: "contraseña-en-claro" })),
		).toThrow(/AUTH_PASSWORD_HASH/);
	});

	it("exige un AUTH_SECRET suficientemente largo", () => {
		expect(() => loadEnv(authEnv({ AUTH_SECRET: "corto" }))).toThrow(
			/AUTH_SECRET/,
		);
	});

	it("no filtra el hash ni el secreto en los mensajes de error", () => {
		try {
			loadEnv(authEnv({ AUTH_SESSION_DAYS: "0" }));
			expect.unreachable("debería haber lanzado");
		} catch (error) {
			const message = (error as Error).message;
			expect(message).not.toContain(SECRET);
			expect(message).not.toContain(passwordHash);
		}
	});

	it("expone la config de auth con sus valores por defecto", () => {
		const config = authConfigFromEnv(loadEnv(authEnv()));

		expect(config).toEqual({
			username: "poio",
			passwordHash,
			secret: SECRET,
			sessionDays: 30,
			cookieSecure: false,
		});
	});

	it("AUTH_COOKIE_SECURE se activa solo con 'true'", () => {
		expect(
			loadEnv(authEnv({ AUTH_COOKIE_SECURE: "true" })).AUTH_COOKIE_SECURE,
		).toBe(true);
		expect(() => loadEnv(authEnv({ AUTH_COOKIE_SECURE: "sí" }))).toThrow(
			/AUTH_COOKIE_SECURE/,
		);
	});
});
