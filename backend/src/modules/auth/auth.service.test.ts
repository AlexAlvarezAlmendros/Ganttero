import { beforeAll, describe, expect, it } from "vitest";
import { TooManyRequestsError, UnauthorizedError } from "../../lib/errors.js";
import { hashPassword } from "./auth.password.js";
import { AuthService } from "./auth.service.js";

const PASSWORD = "contraseña-de-prueba";
let passwordHash: string;

beforeAll(async () => {
	passwordHash = await hashPassword(PASSWORD);
});

/** Reloj inyectable: el tiempo avanza cuando el test lo dice, no solo. */
function clock(startIso = "2026-08-09T10:00:00.000Z") {
	let current = new Date(startIso).getTime();
	return {
		now: () => new Date(current),
		advanceSeconds: (seconds: number) => {
			current += seconds * 1000;
		},
	};
}

function service(now: () => Date, overrides: { sessionDays?: number } = {}) {
	return new AuthService(
		{
			username: "poio",
			passwordHash,
			secret: "secreto-de-pruebas-con-mas-de-32-caracteres",
			sessionDays: overrides.sessionDays ?? 30,
		},
		now,
	);
}

describe("AuthService — login", () => {
	it("devuelve un token válido con las credenciales correctas", async () => {
		const time = clock();
		const auth = service(time.now);

		const token = await auth.login("poio", PASSWORD, "10.0.0.5");

		expect(auth.verifyToken(token)).toBe("poio");
	});

	it("rechaza contraseña incorrecta y usuario incorrecto por igual", async () => {
		const time = clock();
		const auth = service(time.now);

		await expect(auth.login("poio", "otra", "10.0.0.5")).rejects.toBeInstanceOf(
			UnauthorizedError,
		);
		await expect(
			auth.login("otro", PASSWORD, "10.0.0.6"),
		).rejects.toBeInstanceOf(UnauthorizedError);
	});
});

describe("AuthService — token de sesión", () => {
	it("rechaza token ausente, vacío o sin firma", () => {
		const auth = service(clock().now);

		expect(auth.verifyToken(undefined)).toBeNull();
		expect(auth.verifyToken("")).toBeNull();
		expect(auth.verifyToken("solopayload")).toBeNull();
	});

	it("rechaza un token con la firma manipulada", async () => {
		const auth = service(clock().now);
		const token = await auth.login("poio", PASSWORD, "ip");
		const [payload, signature] = token.split(".") as [string, string];

		expect(
			auth.verifyToken(`${payload}.${signature.slice(0, -1)}x`),
		).toBeNull();
	});

	it("rechaza un payload manipulado aunque conserve la firma original", async () => {
		const auth = service(clock().now);
		const token = await auth.login("poio", PASSWORD, "ip");
		const [payload, signature] = token.split(".") as [string, string];
		const decoded = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		) as { u: string; exp: number };
		const forged = Buffer.from(
			JSON.stringify({ ...decoded, exp: decoded.exp * 2 }),
		).toString("base64url");

		expect(auth.verifyToken(`${forged}.${signature}`)).toBeNull();
	});

	it("rechaza un token firmado con otro secreto", async () => {
		const auth = service(clock().now);
		const otro = new AuthService({
			username: "poio",
			passwordHash,
			secret: "OTRO-secreto-distinto-de-mas-de-32-caracteres",
			sessionDays: 30,
		});

		expect(auth.verifyToken(otro.issueToken())).toBeNull();
	});

	it("caduca a los AUTH_SESSION_DAYS", async () => {
		const time = clock();
		const auth = service(time.now, { sessionDays: 1 });
		const token = await auth.login("poio", PASSWORD, "ip");

		time.advanceSeconds(23 * 60 * 60);
		expect(auth.verifyToken(token)).toBe("poio");

		time.advanceSeconds(2 * 60 * 60); // total 25 h
		expect(auth.verifyToken(token)).toBeNull();
	});

	it("invalida sesiones si cambia el usuario del .env", async () => {
		const time = clock();
		const token = await service(time.now).login("poio", PASSWORD, "ip");
		const renombrado = new AuthService(
			{
				username: "alex",
				passwordHash,
				secret: "secreto-de-pruebas-con-mas-de-32-caracteres",
				sessionDays: 30,
			},
			time.now,
		);

		expect(renombrado.verifyToken(token)).toBeNull();
	});
});

describe("AuthService — rate limit", () => {
	async function failTimes(auth: AuthService, times: number, ip: string) {
		for (let i = 0; i < times; i++) {
			await expect(auth.login("poio", "mala", ip)).rejects.toBeInstanceOf(
				UnauthorizedError,
			);
		}
	}

	it("bloquea con backoff tras los intentos libres", async () => {
		const time = clock();
		const auth = service(time.now);

		await failTimes(auth, 6, "10.0.0.9");

		await expect(
			auth.login("poio", PASSWORD, "10.0.0.9"),
		).rejects.toBeInstanceOf(TooManyRequestsError);

		// Pasado el bloqueo (30 s), la contraseña correcta vuelve a entrar.
		time.advanceSeconds(31);
		await expect(auth.login("poio", PASSWORD, "10.0.0.9")).resolves.toBeTypeOf(
			"string",
		);
	});

	it("dobla la espera en cada fallo posterior", async () => {
		const time = clock();
		const auth = service(time.now);

		await failTimes(auth, 6, "ip");
		time.advanceSeconds(31);
		await failTimes(auth, 1, "ip"); // 7º fallo → 60 s

		const error = await auth
			.login("poio", PASSWORD, "ip")
			.catch((thrown: unknown) => thrown);
		expect(error).toBeInstanceOf(TooManyRequestsError);
		expect((error as TooManyRequestsError).retryAfterSeconds).toBe(60);
	});

	it("el bloqueo es por cliente: otra IP no queda afectada", async () => {
		const time = clock();
		const auth = service(time.now);

		await failTimes(auth, 6, "10.0.0.1");

		await expect(auth.login("poio", PASSWORD, "10.0.0.2")).resolves.toBeTypeOf(
			"string",
		);
	});

	it("un login correcto limpia el historial de fallos", async () => {
		const time = clock();
		const auth = service(time.now);

		await failTimes(auth, 3, "ip");
		await auth.login("poio", PASSWORD, "ip");
		await failTimes(auth, 5, "ip"); // vuelve a tener los intentos libres

		await expect(auth.login("poio", PASSWORD, "ip")).resolves.toBeTypeOf(
			"string",
		);
	});
});
