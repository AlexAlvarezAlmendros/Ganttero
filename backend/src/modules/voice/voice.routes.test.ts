import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";
import type { CapturedItem } from "./voice.schema.js";
import { VoiceService } from "./voice.service.js";
import type { Structurer } from "./voice.structurer.js";
import type { SttRunner } from "./voice.stt.js";

const fixedNow = () => new Date(2026, 6, 23, 12, 0);

const capturedItem: CapturedItem = {
	title: "Configurar backups del NAS",
	type: "task",
	description: null,
	estimate_min: 180,
	start_date: "2026-07-24",
	end_date: "2026-07-26",
	dependencies: [],
};

function multipartBody(): { payload: Buffer; headers: Record<string, string> } {
	const boundary = "----ganttero-test";
	const payload = Buffer.concat([
		Buffer.from(
			`--${boundary}\r\ncontent-disposition: form-data; name="audio"; filename="nota.webm"\r\ncontent-type: audio/webm\r\n\r\n`,
		),
		Buffer.from("fake-audio-bytes"),
		Buffer.from(`\r\n--${boundary}--\r\n`),
	]);
	return {
		payload,
		headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
	};
}

describe("POST /voice", () => {
	let app: FastifyInstance;
	let audioDir: string;
	let stt: SttRunner;
	let structurer: Structurer;

	beforeEach(async () => {
		audioDir = await mkdtemp(join(tmpdir(), "ganttero-audio-"));
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: fixedNow });
		stt = {
			transcribe: vi.fn().mockResolvedValue({
				text: "configurar los backups del NAS, unas tres horas, para el viernes",
				language: "es",
				audio_sec: 9.5,
				latency_sec: 3.2,
				model: "small",
			}),
		};
		structurer = {
			structure: vi.fn().mockResolvedValue({ item: capturedItem, attempts: 1 }),
		};
		app = buildApp({
			db,
			now: fixedNow,
			voice: {
				service: new VoiceService(stt, structurer, fixedNow),
				audioDir,
			},
		});
	});

	it("devuelve el formulario pre-relleno y retiene el audio (ajuste por defecto)", async () => {
		const { payload, headers } = multipartBody();
		const response = await app.inject({
			method: "POST",
			url: "/voice",
			payload,
			headers,
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.item.title).toBe("Configurar backups del NAS");
		expect(body.transcript).toContain("backups");
		expect(body.audio_path).not.toBeNull();
		expect(await readdir(audioDir)).toHaveLength(1); // retenido
	});

	it("con retención desactivada no deja rastro del audio", async () => {
		await app.inject({
			method: "PATCH",
			url: "/settings",
			payload: { retain_audio: false },
		});

		const { payload, headers } = multipartBody();
		const response = await app.inject({
			method: "POST",
			url: "/voice",
			payload,
			headers,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().audio_path).toBeNull();
		expect(await readdir(audioDir)).toHaveLength(0);
	});

	it("si la IA falla devuelve 422 con la transcripción (fallback manual)", async () => {
		structurer.structure = vi.fn().mockRejectedValue(new Error("no hay JSON"));

		const { payload, headers } = multipartBody();
		const response = await app.inject({
			method: "POST",
			url: "/voice",
			payload,
			headers,
		});

		expect(response.statusCode).toBe(422);
		expect(response.json().error).toContain("backups"); // la transcripción viaja en el error
	});
});
