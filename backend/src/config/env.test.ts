import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

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
