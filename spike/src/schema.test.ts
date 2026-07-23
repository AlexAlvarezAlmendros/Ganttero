import { describe, expect, it } from "vitest";
import { parseCapturedItem } from "./schema.js";

const valid = {
	title: "Montar el runner de migraciones",
	type: "task",
	description: "Runner up/down sobre libSQL con fichero en el NAS",
	estimate_min: 120,
	start_date: "2026-07-27",
	end_date: "2026-07-29",
	dependencies: ["Scaffold del monorepo"],
};

describe("capturedItemSchema", () => {
	it("acepta una captura completa", () => {
		const result = parseCapturedItem(valid);
		expect(result.success).toBe(true);
	});

	it("acepta los campos no mencionados en el audio como null", () => {
		const result = parseCapturedItem({
			...valid,
			description: null,
			estimate_min: null,
			start_date: null,
			end_date: null,
			dependencies: [],
		});
		expect(result.success).toBe(true);
	});

	it("rechaza un tipo fuera de epic/task/subtask", () => {
		const result = parseCapturedItem({ ...valid, type: "milestone" });
		expect(result.success).toBe(false);
	});

	it("rechaza título vacío o solo espacios", () => {
		const result = parseCapturedItem({ ...valid, title: "   " });
		expect(result.success).toBe(false);
	});

	it("rechaza fechas con formato no ISO", () => {
		const result = parseCapturedItem({ ...valid, start_date: "27/07/2026" });
		expect(result.success).toBe(false);
	});

	it("rechaza fechas inexistentes en el calendario", () => {
		const result = parseCapturedItem({ ...valid, start_date: "2026-02-30" });
		expect(result.success).toBe(false);
	});

	it("rechaza end_date anterior a start_date", () => {
		const result = parseCapturedItem({
			...valid,
			start_date: "2026-07-29",
			end_date: "2026-07-27",
		});
		expect(result.success).toBe(false);
	});

	it("permite end_date sin start_date (deadline suelta)", () => {
		const result = parseCapturedItem({ ...valid, start_date: null });
		expect(result.success).toBe(true);
	});

	it("rechaza estimaciones no enteras o negativas", () => {
		expect(parseCapturedItem({ ...valid, estimate_min: -30 }).success).toBe(
			false,
		);
		expect(parseCapturedItem({ ...valid, estimate_min: 45.5 }).success).toBe(
			false,
		);
	});

	it("rechaza campos extra inventados por la IA", () => {
		const result = parseCapturedItem({ ...valid, assignee: "yo" });
		expect(result.success).toBe(false);
	});
});
