import type { FastifyInstance } from "fastify";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../build-app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";
import { hashPassword } from "./auth.password.js";
import { AuthService } from "./auth.service.js";

const PASSWORD = "contraseña-de-prueba";
const fixedNow = () => new Date("2026-08-09T10:00:00.000Z");
let passwordHash: string;

beforeAll(async () => {
	passwordHash = await hashPassword(PASSWORD);
});

async function authedApp(cookieSecure = false): Promise<FastifyInstance> {
	const db = await createDbClient(":memory:");
	await migrateUp(db, migrations, { now: fixedNow });
	const service = new AuthService(
		{
			username: "poio",
			passwordHash,
			secret: "secreto-de-pruebas-con-mas-de-32-caracteres",
			sessionDays: 30,
		},
		fixedNow,
	);
	return buildApp({ db, now: fixedNow, auth: { service, cookieSecure } });
}

function sessionCookie(setCookie: string | string[] | undefined): string {
	const raw = Array.isArray(setCookie)
		? (setCookie[0] ?? "")
		: (setCookie ?? "");
	return raw.split(";")[0] ?? "";
}

describe("rutas /auth", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		app = await authedApp();
	});

	it("POST /auth/login con credenciales correctas devuelve la cookie de sesión", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: PASSWORD },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ authenticated: true, username: "poio" });
		const cookie = response.headers["set-cookie"];
		const raw = Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? "");
		expect(raw).toContain("ganttero_session=");
		expect(raw).toContain("HttpOnly");
		expect(raw).toContain("SameSite=Lax");
		expect(raw).toContain("Path=/");
		expect(raw).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
		expect(raw).not.toContain("Secure");
	});

	it("añade Secure cuando se sirve por HTTPS", async () => {
		const secureApp = await authedApp(true);

		const response = await secureApp.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: PASSWORD },
		});

		const cookie = response.headers["set-cookie"];
		const raw = Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? "");
		expect(raw).toContain("Secure");
	});

	it("POST /auth/login con contraseña incorrecta devuelve 401 sin cookie", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: "mala" },
		});

		expect(response.statusCode).toBe(401);
		expect(response.headers["set-cookie"]).toBeUndefined();
		// El mensaje no distingue usuario de contraseña: no da pistas.
		expect(response.json().error).toBe("usuario o contraseña incorrectos");
	});

	it("POST /auth/login con body inválido devuelve 400", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio" },
		});

		expect(response.statusCode).toBe(400);
	});

	it("devuelve 429 con Retry-After tras insistir", async () => {
		for (let i = 0; i < 6; i++) {
			await app.inject({
				method: "POST",
				url: "/auth/login",
				payload: { username: "poio", password: "mala" },
			});
		}

		const blocked = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: PASSWORD },
		});

		expect(blocked.statusCode).toBe(429);
		expect(blocked.headers["retry-after"]).toBe("30");
	});

	it("GET /auth/session refleja si hay sesión", async () => {
		const anon = await app.inject({ method: "GET", url: "/auth/session" });
		expect(anon.json()).toEqual({
			auth_enabled: true,
			authenticated: false,
			username: null,
		});

		const login = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: PASSWORD },
		});
		const authed = await app.inject({
			method: "GET",
			url: "/auth/session",
			headers: { cookie: sessionCookie(login.headers["set-cookie"]) },
		});

		expect(authed.json()).toEqual({
			auth_enabled: true,
			authenticated: true,
			username: "poio",
		});
	});

	it("POST /auth/logout caduca la cookie", async () => {
		const response = await app.inject({ method: "POST", url: "/auth/logout" });

		expect(response.statusCode).toBe(204);
		const cookie = response.headers["set-cookie"];
		const raw = Array.isArray(cookie) ? (cookie[0] ?? "") : (cookie ?? "");
		expect(raw).toContain("Max-Age=0");
	});
});

describe("puerta global de autenticación", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		app = await authedApp();
	});

	it("las rutas de datos responden 401 sin cookie", async () => {
		for (const url of ["/projects", "/items?project_id=1", "/settings"]) {
			const response = await app.inject({ method: "GET", url });
			expect(response.statusCode, url).toBe(401);
		}

		const write = await app.inject({
			method: "POST",
			url: "/projects",
			payload: { name: "Ganttero", key_prefix: "GP" },
		});
		expect(write.statusCode).toBe(401);
	});

	it("responde 401 con una cookie manipulada", async () => {
		const login = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: PASSWORD },
		});
		const cookie = sessionCookie(login.headers["set-cookie"]);

		const tampered = await app.inject({
			method: "GET",
			url: "/projects",
			headers: { cookie: `${cookie.slice(0, -1)}x` },
		});

		expect(tampered.statusCode).toBe(401);
	});

	it("con la cookie válida las rutas responden normalmente", async () => {
		const login = await app.inject({
			method: "POST",
			url: "/auth/login",
			payload: { username: "poio", password: PASSWORD },
		});
		const cookie = sessionCookie(login.headers["set-cookie"]);

		const projects = await app.inject({
			method: "GET",
			url: "/projects",
			headers: { cookie },
		});

		expect(projects.statusCode).toBe(200);
		expect(projects.json()).toEqual([]);
	});

	it("/health queda fuera de la puerta (healthcheck de Docker)", async () => {
		const response = await app.inject({ method: "GET", url: "/health" });

		expect(response.statusCode).toBe(200);
	});
});

describe("app sin autenticación configurada", () => {
	it("GET /auth/session anuncia que la auth está desactivada", async () => {
		const app = buildApp({ now: fixedNow });

		const response = await app.inject({ method: "GET", url: "/auth/session" });

		expect(response.json()).toEqual({
			auth_enabled: false,
			authenticated: true,
			username: null,
		});
	});
});
