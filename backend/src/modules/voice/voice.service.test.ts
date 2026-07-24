import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../../lib/errors.js";
import type { CapturedItem } from "./voice.schema.js";
import { VoiceService } from "./voice.service.js";
import type { Structurer } from "./voice.structurer.js";
import type { SttRunner } from "./voice.stt.js";

const fixedNow = () => new Date(2026, 6, 23, 12, 0); // local: 2026-07-23

const capturedItem: CapturedItem = {
	title: "Configurar backups del NAS",
	type: "task",
	description: null,
	estimate_min: 180,
	start_date: "2026-07-24",
	end_date: "2026-07-26",
	dependencies: [],
};

function mockStt(text = "configurar los backups del NAS"): SttRunner {
	return {
		transcribe: vi.fn().mockResolvedValue({
			text,
			language: "es",
			audio_sec: 9.5,
			latency_sec: 3.2,
			model: "small",
		}),
	};
}

function mockStructurer(): Structurer {
	return {
		structure: vi.fn().mockResolvedValue({ item: capturedItem, attempts: 1 }),
	};
}

describe("VoiceService.capture", () => {
	it("encadena STT → IA y devuelve el ítem con la transcripción", async () => {
		const structurer = mockStructurer();
		const service = new VoiceService(mockStt(), structurer, fixedNow);

		const result = await service.capture("/tmp/audio.webm", "/nas/audio.webm");

		expect(result.item.title).toBe("Configurar backups del NAS");
		expect(result.transcript).toContain("backups");
		expect(result.audio_path).toBe("/nas/audio.webm");
		expect(structurer.structure).toHaveBeenCalledWith(
			"configurar los backups del NAS",
			"2026-07-23", // "hoy" LOCAL inyectado
		);
	});

	it("si el STT falla → DomainError (el front degrada a formulario)", async () => {
		const stt: SttRunner = {
			transcribe: vi.fn().mockRejectedValue(new Error("whisper caído")),
		};
		const service = new VoiceService(stt, mockStructurer(), fixedNow);

		await expect(service.capture("/tmp/a.webm", null)).rejects.toThrow(
			DomainError,
		);
	});

	it("si la IA no estructura → DomainError CON la transcripción dentro", async () => {
		const structurer: Structurer = {
			structure: vi.fn().mockRejectedValue(new Error("sin JSON válido")),
		};
		const service = new VoiceService(
			mockStt("texto raro"),
			structurer,
			fixedNow,
		);

		await expect(service.capture("/tmp/a.webm", null)).rejects.toThrow(
			/texto raro/,
		);
	});
});
