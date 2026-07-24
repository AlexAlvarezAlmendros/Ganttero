import { DomainError } from "../../lib/errors.js";
import { localDayIso } from "../kanban/kanban.service.js";
import type { VoiceCaptureResponse } from "./voice.schema.js";
import type { Structurer } from "./voice.structurer.js";
import type { SttRunner } from "./voice.stt.js";

/**
 * Orquestador de voz: audio → STT → Gemma → JSON validado.
 * Cualquier fallo del pipeline se convierte en DomainError (422): el
 * frontend degrada a formulario manual SIN bloquear la creación.
 */
export class VoiceService {
	constructor(
		private readonly stt: SttRunner,
		private readonly structurer: Structurer,
		private readonly now: () => Date = () => new Date(),
	) {}

	async capture(
		audioPath: string,
		retainedPath: string | null,
	): Promise<VoiceCaptureResponse> {
		const sttStarted = performance.now();
		let transcript: string;
		try {
			const result = await this.stt.transcribe(audioPath);
			transcript = result.text;
		} catch (error) {
			throw new DomainError(
				`no se pudo transcribir el audio (${error instanceof Error ? error.message : "error"})`,
			);
		}
		const sttDone = performance.now();

		try {
			const today = localDayIso(this.now());
			const { item, attempts } = await this.structurer.structure(
				transcript,
				today,
			);
			return {
				transcript,
				item,
				stt_sec: (sttDone - sttStarted) / 1000,
				llm_sec: (performance.now() - sttDone) / 1000,
				attempts,
				audio_path: retainedPath,
			};
		} catch (error) {
			// La transcripción existe pero la IA no pudo estructurar: el error
			// lleva el texto (para el formulario manual) y la causa (para el log).
			const cause = error instanceof Error ? error.message : "error";
			throw new DomainError(
				`la IA no entendió la tarea (${cause}); transcripción: «${transcript}»`,
			);
		}
	}
}
