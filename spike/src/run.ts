import { parseArgs } from "node:util";
import { StructureError, structureTranscript } from "./structure.js";
import { transcribe } from "./stt.js";

/**
 * CLI del spike: encadena audio → STT → Gemma → JSON validado y mide cada paso.
 *
 *   pnpm capture audios/1.aac
 *   pnpm capture audios/*.aac --today 2026-07-23
 *
 * Con varios audios emite además el resumen de fiabilidad/latencia (0.6/0.7).
 * "hoy" se calcula aquí, en el borde, una sola vez; el resto del código lo
 * recibe siempre inyectado.
 */

interface CaptureRow {
	audio: string;
	ok: boolean;
	transcript: string;
	sttSec: number;
	llmSec: number;
	totalSec: number;
	attempts: number;
	item: unknown;
	error: string | null;
}

interface CaptureConfig {
	today: string;
	baseUrl?: string;
	model?: string;
}

async function captureOne(audio: string, config: CaptureConfig): Promise<CaptureRow> {
	const started = performance.now();
	const stt = await transcribe(audio);
	const sttDone = performance.now();
	try {
		const { item, attempts } = await structureTranscript(stt.text, {
			today: config.today,
			...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
			...(config.model ? { model: config.model } : {}),
		});
		const finished = performance.now();
		return {
			audio,
			ok: true,
			transcript: stt.text,
			sttSec: (sttDone - started) / 1000,
			llmSec: (finished - sttDone) / 1000,
			totalSec: (finished - started) / 1000,
			attempts,
			item,
			error: null,
		};
	} catch (error) {
		const finished = performance.now();
		return {
			audio,
			ok: false,
			transcript: stt.text,
			sttSec: (sttDone - started) / 1000,
			llmSec: (finished - sttDone) / 1000,
			totalSec: (finished - started) / 1000,
			attempts: error instanceof StructureError ? error.attempts : 0,
			item: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const { values, positionals } = parseArgs({
	options: {
		today: { type: "string" },
		ollama: { type: "string" },
		model: { type: "string" },
	},
	allowPositionals: true,
});

if (positionals.length === 0) {
	console.error(
		"uso: pnpm capture <audio…> [--today YYYY-MM-DD] [--ollama http://host:11434] [--model gemma4:latest]",
	);
	process.exit(2);
}

const config: CaptureConfig = {
	today: values.today ?? new Date().toISOString().slice(0, 10),
	...(values.ollama ? { baseUrl: values.ollama } : {}),
	...(values.model ? { model: values.model } : {}),
};
const rows: CaptureRow[] = [];

for (const audio of positionals) {
	console.error(`▶ ${audio}`);
	const row = await captureOne(audio, config);
	rows.push(row);
	console.error(
		`  stt ${row.sttSec.toFixed(1)}s · gemma ${row.llmSec.toFixed(1)}s · ${
			row.ok ? `OK (intentos: ${row.attempts})` : `FALLO: ${row.error}`
		}`,
	);
	console.error(`  «${row.transcript}»`);
	console.log(JSON.stringify({ audio: row.audio, ok: row.ok, item: row.item }, null, 2));
}

if (rows.length > 1) {
	const okRows = rows.filter((row) => row.ok);
	const totals = rows.map((row) => row.totalSec);
	console.error("\n═══ Resumen (0.6 fiabilidad / 0.7 latencia) ═══");
	console.error(
		`fiabilidad: ${okRows.length}/${rows.length} (${Math.round((okRows.length / rows.length) * 100)} %)`,
	);
	console.error(
		`latencia total: mediana ${median(totals).toFixed(1)}s · min ${Math.min(...totals).toFixed(1)}s · max ${Math.max(...totals).toFixed(1)}s`,
	);
	console.error(
		`  desglose mediano: stt ${median(rows.map((r) => r.sttSec)).toFixed(1)}s · gemma ${median(rows.map((r) => r.llmSec)).toFixed(1)}s`,
	);
}

process.exit(rows.every((row) => row.ok) ? 0 : 1);
