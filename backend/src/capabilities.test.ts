import { describe, expect, it } from "vitest";
import { buildApp } from "./build-app.js";
import { createDbClient } from "./db/client.js";
import { migrateUp } from "./db/migrations.js";
import { migrations } from "./db/migrations/index.js";

/**
 * `/capabilities` es el contrato entre el backend y la UI sobre qué ofrece
 * ESTE despliegue: el homeserver lo tiene todo, Vercel no la voz. Si miente,
 * la UI enseña un micro que no funciona.
 */
async function appWith(options: Parameters<typeof buildApp>[0] = {}) {
	const db = await createDbClient(":memory:");
	await migrateUp(db, migrations);
	return buildApp({ db, ...options });
}

async function capabilitiesOf(app: Awaited<ReturnType<typeof appWith>>) {
	return (await app.inject({ method: "GET", url: "/capabilities" })).json();
}

describe("GET /capabilities", () => {
	it("un despliegue pelado no anuncia nada", async () => {
		expect(await capabilitiesOf(await appWith())).toEqual({
			voice: false,
			describer: false,
			github: false,
			github_polling: false,
			mcp: false,
		});
	});

	it("anuncia la voz solo si está cableada", async () => {
		const app = await appWith({
			voice: {
				service: {} as never,
				audioDir: "/tmp/audios",
			},
		});
		expect((await capabilitiesOf(app)).voice).toBe(true);
	});

	it("distingue GitHub configurado de GitHub con polling", async () => {
		const sinPolling = await appWith({
			github: {
				client: {} as never,
				status: { token_configured: true, poll_seconds: 0 },
			},
		});
		const conPolling = await appWith({
			github: {
				client: {} as never,
				status: { token_configured: true, poll_seconds: 300 },
			},
		});

		expect(await capabilitiesOf(sinPolling)).toMatchObject({
			github: true,
			github_polling: false,
		});
		expect(await capabilitiesOf(conPolling)).toMatchObject({
			github: true,
			github_polling: true,
		});
	});

	it("anuncia el MCP cuando hay token", async () => {
		const app = await appWith({
			mcp: { token: "token-de-pruebas-con-mas-de-32-caracteres" },
		});
		expect((await capabilitiesOf(app)).mcp).toBe(true);
	});
});
