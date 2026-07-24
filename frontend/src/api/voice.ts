import { useMutation } from "@tanstack/react-query";
import { ApiError } from "./client.js";
import type { ItemType } from "./types.js";

export interface CapturedItem {
	title: string;
	type: ItemType;
	description: string | null;
	estimate_min: number | null;
	start_date: string | null;
	end_date: string | null;
	dependencies: string[];
}

export interface VoiceCaptured {
	transcript: string;
	item: CapturedItem;
	stt_sec: number;
	llm_sec: number;
	attempts: number;
	audio_path: string | null;
}

/** Sube el audio grabado; el backend devuelve el formulario pre-relleno. */
export function useVoiceCapture() {
	return useMutation({
		mutationFn: async (audio: Blob): Promise<VoiceCaptured> => {
			const body = new FormData();
			body.append("audio", audio, "nota.webm");
			const response = await fetch("/api/voice", { method: "POST", body });
			if (!response.ok) {
				let detail = `voz → ${response.status}`;
				try {
					const payload = (await response.json()) as { error?: string };
					if (payload.error) detail = payload.error;
				} catch {
					// sin cuerpo JSON
				}
				throw new ApiError(response.status, detail);
			}
			return (await response.json()) as VoiceCaptured;
		},
	});
}
