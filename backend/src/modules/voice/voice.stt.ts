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

export interface SttRunner {
	transcribe(audioPath: string): Promise<SttResult>;
}

export interface PythonSttOptions {
	pythonBin: string;
	scriptPath: string;
	model: string;
}

/** STT delegado en faster-whisper (stt.py, heredado del spike de la Fase 0). */
export class PythonStt implements SttRunner {
	constructor(private readonly options: PythonSttOptions) {}

	async transcribe(audioPath: string): Promise<SttResult> {
		const { stdout } = await execFileAsync(
			this.options.pythonBin,
			[this.options.scriptPath, audioPath, "--model", this.options.model],
			{ timeout: 120_000 },
		);
		return sttResultSchema.parse(JSON.parse(stdout));
	}
}
