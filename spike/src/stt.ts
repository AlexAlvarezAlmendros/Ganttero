import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

export const sttResultSchema = z
	.object({
		text: z.string().min(1),
		language: z.string(),
		audio_sec: z.number().nonnegative(),
		latency_sec: z.number().nonnegative(),
		model: z.string(),
	})
	.strict();

export type SttResult = z.infer<typeof sttResultSchema>;

export interface SttOptions {
	model?: string;
	pythonBin?: string;
	scriptPath?: string;
}

/**
 * Transcribe un audio delegando en `stt.py` (faster-whisper en el venv del
 * spike). Lanza si el proceso falla o si la salida no cumple el contrato.
 */
export async function transcribe(
	audioPath: string,
	options: SttOptions = {},
): Promise<SttResult> {
	const {
		model = "small",
		pythonBin = new URL("../.venv/bin/python", import.meta.url).pathname,
		scriptPath = new URL("../stt.py", import.meta.url).pathname,
	} = options;

	const { stdout } = await execFileAsync(
		pythonBin,
		[scriptPath, audioPath, "--model", model],
		{ timeout: 120_000 },
	);
	return sttResultSchema.parse(JSON.parse(stdout));
}
