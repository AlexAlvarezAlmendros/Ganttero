import { describe, expect, it } from "vitest";
import {
	hashPassword,
	isValidPasswordHash,
	verifyPassword,
} from "./auth.password.js";

describe("hash de contraseña (scrypt)", () => {
	it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
		const hash = await hashPassword("contraseña-larga-y-segura");

		expect(await verifyPassword("contraseña-larga-y-segura", hash)).toBe(true);
		expect(await verifyPassword("contraseña-larga-y-segurA", hash)).toBe(false);
		expect(await verifyPassword("", hash)).toBe(false);
	});

	it("usa sal aleatoria: dos hashes de la misma contraseña difieren", async () => {
		const first = await hashPassword("misma");
		const second = await hashPassword("misma");

		expect(first).not.toBe(second);
		expect(await verifyPassword("misma", second)).toBe(true);
	});

	it("no guarda la contraseña en claro dentro del hash", async () => {
		const hash = await hashPassword("secreto-visible");

		expect(hash).not.toContain("secreto-visible");
		expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
	});

	it("rechaza hashes con formato inválido sin lanzar", async () => {
		for (const bad of ["", "plano", "scrypt$a$b$c$d$e", "bcrypt$1$2$3$4$5"]) {
			expect(isValidPasswordHash(bad)).toBe(false);
			expect(await verifyPassword("x", bad)).toBe(false);
		}
	});

	it("acepta un hash bien formado", async () => {
		expect(isValidPasswordHash(await hashPassword("x"))).toBe(true);
	});
});
