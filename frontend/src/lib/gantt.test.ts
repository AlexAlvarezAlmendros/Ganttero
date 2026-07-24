import { describe, expect, it } from "vitest";
import type { Item } from "../api/types.js";
import {
	addDays,
	barSpan,
	buildRows,
	daysBetween,
	headerTicks,
	isVisibleAtScale,
	pct,
	scaleRange,
} from "./gantt.js";

const TODAY = "2026-07-23"; // jueves

function makeItem(overrides: Partial<Item>): Item {
	return {
		id: 1,
		project_id: 1,
		parent_id: null,
		type: "task",
		key: "GP-1",
		title: "x",
		description: null,
		status: "backlog",
		start_date: null,
		end_date: null,
		estimate_min: null,
		created_at: "",
		updated_at: "",
		...overrides,
	};
}

describe("aritmética de días (UTC)", () => {
	it("addDays cruza meses y años", () => {
		expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});

	it("daysBetween es simétrico y en días exactos", () => {
		expect(daysBetween("2026-07-23", "2026-07-25")).toBe(2);
		expect(daysBetween("2026-07-25", "2026-07-23")).toBe(-2);
	});
});

describe("scaleRange (hoy inyectado)", () => {
	it("año cubre el año natural", () => {
		expect(scaleRange("año", TODAY)).toEqual({
			start: "2026-01-01",
			end: "2026-12-31",
		});
	});

	it("6m: del mes anterior a +4 meses (6 en total)", () => {
		expect(scaleRange("6m", TODAY)).toEqual({
			start: "2026-06-01",
			end: "2026-11-30",
		});
	});

	it("mes: mes actual + siguiente", () => {
		expect(scaleRange("mes", TODAY)).toEqual({
			start: "2026-07-01",
			end: "2026-08-31",
		});
	});

	it("semana: arranca en lunes y abarca 3 semanas", () => {
		const range = scaleRange("semana", TODAY);
		expect(range.start).toBe("2026-07-20"); // lunes de esa semana
		expect(daysBetween(range.start, range.end)).toBe(20);
	});

	it("día: hoy-1 → hoy+5", () => {
		expect(scaleRange("día", TODAY)).toEqual({
			start: "2026-07-22",
			end: "2026-07-28",
		});
	});
});

describe("pct y barSpan", () => {
	const range = { start: "2026-07-01", end: "2026-07-31" };

	it("los bordes del rango dan 0 y ~100", () => {
		expect(pct(range, "2026-07-01")).toBe(0);
		expect(pct(range, "2026-08-01")).toBe(100);
		expect(pct(range, "2026-06-01")).toBe(0); // clamp
		expect(pct(range, "2026-09-01")).toBe(100); // clamp
	});

	it("una barra de un día tiene ancho > 0", () => {
		const span = barSpan(range, "2026-07-10", "2026-07-10");
		expect(span.width).toBeGreaterThan(0);
	});

	it("una barra incluye su día final", () => {
		const span = barSpan(range, "2026-07-01", "2026-07-31");
		expect(span.left).toBe(0);
		expect(span.width).toBeCloseTo(100, 5);
	});
});

describe("agrupación por escala", () => {
	it("a vista de año solo épicas y tareas raíz", () => {
		expect(isVisibleAtScale({ type: "epic", parent_id: null }, "año")).toBe(
			true,
		);
		expect(isVisibleAtScale({ type: "task", parent_id: 5 }, "año")).toBe(false);
		expect(isVisibleAtScale({ type: "task", parent_id: null }, "año")).toBe(
			true,
		);
		expect(isVisibleAtScale({ type: "subtask", parent_id: 5 }, "año")).toBe(
			false,
		);
	});

	it("las subtareas aparecen de mes hacia abajo", () => {
		expect(isVisibleAtScale({ type: "subtask", parent_id: 5 }, "6m")).toBe(
			false,
		);
		expect(isVisibleAtScale({ type: "subtask", parent_id: 5 }, "mes")).toBe(
			true,
		);
		expect(isVisibleAtScale({ type: "subtask", parent_id: 5 }, "día")).toBe(
			true,
		);
	});
});

describe("headerTicks", () => {
	it("meses en escala año", () => {
		const ticks = headerTicks("año", scaleRange("año", TODAY));
		expect(ticks).toHaveLength(12);
		expect(ticks[0]).toEqual({ iso: "2026-01-01", label: "ENE 2026" });
	});

	it("lunes en escala semana y días en escala día", () => {
		expect(headerTicks("semana", scaleRange("semana", TODAY))).toHaveLength(3);
		expect(headerTicks("día", scaleRange("día", TODAY))).toHaveLength(7);
	});
});

describe("buildRows", () => {
	const epic = makeItem({ id: 1, type: "epic", start_date: "2026-07-01" });
	const task = makeItem({
		id: 2,
		parent_id: 1,
		start_date: "2026-07-05",
		key: "GP-2",
	});
	const sub = makeItem({
		id: 3,
		type: "subtask",
		parent_id: 2,
		start_date: "2026-07-06",
		key: "GP-3",
	});
	const rootTask = makeItem({ id: 4, start_date: "2026-06-01", key: "GP-4" });

	it("ordena épica → hijas → tareas raíz con profundidad", () => {
		const rows = buildRows([sub, task, epic, rootTask], "mes");
		expect(rows.map((row) => [row.item.id, row.depth])).toEqual([
			[1, 0],
			[2, 1],
			[3, 2],
			[4, 0],
		]);
	});

	it("a escala año colapsa el detalle", () => {
		const rows = buildRows([sub, task, epic, rootTask], "año");
		expect(rows.map((row) => row.item.id)).toEqual([1, 4]);
	});
});
