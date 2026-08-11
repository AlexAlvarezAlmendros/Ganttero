import { describe, expect, it } from "vitest";
import { createDbClient } from "./client.js";

/**
 * El arranque en serverless es el caso delicado: si la base remota no
 * contesta, el proceso se queda colgado antes de escuchar y la plataforma
 * devuelve un 500 sin una sola línea de log. Estos tests fijan que falle
 * pronto y explicando qué pasa.
 */
describe("createDbClient", () => {
	it("conecta contra una base en memoria", async () => {
		const db = await createDbClient(":memory:");
		const result = await db.execute("SELECT 1 AS uno");
		expect(Number(result.rows[0]?.uno)).toBe(1);
	});

	// 10.255.255.1 no es enrutable: la conexión TCP se queda colgada, que es
	// justo el caso que mata el arranque en serverless (un host inexistente
	// falla rápido por DNS y no ejercita el tope).
	const HOST_QUE_CUELGA = "libsql://10.255.255.1";

	it("falla con un motivo claro si la base remota no responde a tiempo", async () => {
		await expect(createDbClient(HOST_QUE_CUELGA, "token", 300)).rejects.toThrow(
			/no respondió en 300 ms/,
		);
	});

	it("el error nombra el host pero no filtra el token", async () => {
		try {
			await createDbClient(HOST_QUE_CUELGA, "token-que-no-debe-verse", 300);
			expect.unreachable("debería haber lanzado");
		} catch (error) {
			const message = (error as Error).message;
			expect(message).not.toContain("token-que-no-debe-verse");
			// Sí nombra el host: es lo útil para diagnosticar.
			expect(message).toContain("10.255.255.1");
		}
	});
});
