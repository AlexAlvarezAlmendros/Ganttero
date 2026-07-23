import { describe, expect, it } from "vitest";
import { structureTranscript } from "./structure.js";

/**
 * Integración real contra Ollama (gemma4:e4b). Lento en CPU: solo corre con
 *   SPIKE_INTEGRATION=1 pnpm vitest run src/structure.integration.test.ts
 * Ninguno de estos audios menciona fechas ni estimaciones: si aparecen,
 * la IA se las está inventando (regla clave del contrato).
 */

const TRANSCRIPTS = [
	"Hay que crear una radio para la web de OtherPeople y sincronizarla con un directo en YouTube",
	"hay que cambiar el color de la página web de portfolio.",
	"hay que repasar la página de compraventa de bits de la web de other people",
	"hay que hacer una demo de la aplicación de autosil.",
	"Hay que hacer una build de Windows y de Linux del plugin OPRW1 con los nuevos fixes.",
];

describe.skipIf(!process.env.SPIKE_INTEGRATION)(
	"structureTranscript (integración real)",
	() => {
		it.each(TRANSCRIPTS.map((transcript, index) => [index + 1, transcript]))(
			"estructura la transcripción %d sin inventar campos",
			{ timeout: 300_000 },
			async (_index, transcript) => {
				const { item, attempts } = await structureTranscript(
					transcript as string,
					{
						today: "2026-07-23",
					},
				);

				expect(item.title.length).toBeGreaterThan(3);
				expect(item.type).toBe("task");
				expect(item.start_date).toBeNull();
				expect(item.end_date).toBeNull();
				expect(item.estimate_min).toBeNull();
				expect(item.dependencies).toEqual([]);
				expect(attempts).toBe(1);
			},
		);
	},
);
