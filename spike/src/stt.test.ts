import { describe, expect, it } from "vitest";
import { sttResultSchema, transcribe } from "./stt.js";

describe("sttResultSchema", () => {
	it("acepta la salida de stt.py", () => {
		const result = sttResultSchema.safeParse({
			text: "hay que cambiar el color de la página",
			language: "es",
			audio_sec: 8.83,
			latency_sec: 3.07,
			model: "small",
		});
		expect(result.success).toBe(true);
	});

	it("rechaza una transcripción vacía", () => {
		const result = sttResultSchema.safeParse({
			text: "",
			language: "es",
			audio_sec: 8.83,
			latency_sec: 3.07,
			model: "small",
		});
		expect(result.success).toBe(false);
	});
});

// Smoke test real contra el venv + audios del spike (no corre sin ellos).
describe("transcribe (integración)", () => {
	it(
		"transcribe el audio 1 de prueba",
		{ timeout: 120_000 },
		async () => {
			const audio = new URL("../audios/1.aac", import.meta.url).pathname;
			const result = await transcribe(audio);
			expect(result.language).toBe("es");
			expect(result.text.toLowerCase()).toContain("radio");
		},
	);
});
