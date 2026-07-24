import type { Item, ItemType } from "../api/types.js";

/**
 * Lógica pura del Gantt multi-escala. Todo cálculo de fechas es UTC y
 * "hoy" llega SIEMPRE inyectado (nunca new Date() aquí dentro).
 */

export type GanttScale = "año" | "6m" | "mes" | "semana" | "día";

export const SCALES: Array<{ id: GanttScale; label: string; index: string }> = [
	{ id: "año", label: "AÑO", index: "/01" },
	{ id: "6m", label: "6 MESES", index: "/02" },
	{ id: "mes", label: "MES", index: "/03" },
	{ id: "semana", label: "SEMANA", index: "/04" },
	{ id: "día", label: "DÍA", index: "/05" },
];

/** Rango [start, end] en días ISO, ambos incluidos. */
export interface GanttRange {
	start: string;
	end: string;
}

function toUtc(isoDay: string): number {
	return Date.parse(`${isoDay}T00:00:00Z`);
}

function fromUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

export function addDays(isoDay: string, days: number): string {
	return fromUtc(toUtc(isoDay) + days * DAY_MS);
}

/**
 * Día de calendario LOCAL del navegador (no UTC): a las 00:30 hora local
 * "hoy" ya es hoy, aunque UTC siga en ayer. Único punto donde se deriva.
 */
export function localDayIso(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function daysBetween(a: string, b: string): number {
	return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

function monthStart(isoDay: string): string {
	return `${isoDay.slice(0, 7)}-01`;
}

function addMonths(isoMonthStart: string, months: number): string {
	const [year = 0, month = 1] = isoMonthStart.split("-").map(Number);
	const total = year * 12 + (month - 1) + months;
	const newYear = Math.floor(total / 12);
	const newMonth = (total % 12) + 1;
	return `${newYear}-${String(newMonth).padStart(2, "0")}-01`;
}

/** Lunes de la semana del día dado (ISO: lunes = inicio). */
function weekStart(isoDay: string): string {
	const weekday = new Date(toUtc(isoDay)).getUTCDay(); // 0=domingo
	const offset = weekday === 0 ? 6 : weekday - 1;
	return addDays(isoDay, -offset);
}

export function scaleRange(scale: GanttScale, today: string): GanttRange {
	switch (scale) {
		case "año":
			return {
				start: `${today.slice(0, 4)}-01-01`,
				end: `${today.slice(0, 4)}-12-31`,
			};
		case "6m": {
			const start = addMonths(monthStart(today), -1);
			return { start, end: addDays(addMonths(start, 6), -1) };
		}
		case "mes": {
			const start = monthStart(today);
			return { start, end: addDays(addMonths(start, 2), -1) };
		}
		case "semana": {
			const start = weekStart(today);
			return { start, end: addDays(start, 20) };
		}
		case "día":
			return { start: addDays(today, -1), end: addDays(today, 5) };
	}
}

/** Posición 0–100 de un día dentro del rango (clamp a los bordes). */
export function pct(range: GanttRange, isoDay: string): number {
	const total = toUtc(range.end) + DAY_MS - toUtc(range.start);
	const value = ((toUtc(isoDay) - toUtc(range.start)) / total) * 100;
	return Math.min(100, Math.max(0, value));
}

/** Ancho 0–100 de una barra [start, end] (end incluido). */
export function barSpan(
	range: GanttRange,
	start: string,
	end: string,
): { left: number; width: number } {
	const left = pct(range, start);
	const right = pct(range, addDays(end, 1));
	return { left, width: Math.max(right - left, 0.8) };
}

/**
 * Agrupación por escala (functional.md §3.4): a vista de año solo épicas
 * (y tareas raíz, que no tienen contenedora); el detalle crece al acercar.
 */
export function isVisibleAtScale(
	item: Pick<Item, "type" | "parent_id">,
	scale: GanttScale,
): boolean {
	if (item.type === "epic") return true;
	if (item.type === "task") return scale !== "año" || item.parent_id === null;
	return scale === "mes" || scale === "semana" || scale === "día";
}

export interface GanttTick {
	iso: string;
	label: string;
}

const MONTHS = [
	"ENE",
	"FEB",
	"MAR",
	"ABR",
	"MAY",
	"JUN",
	"JUL",
	"AGO",
	"SEP",
	"OCT",
	"NOV",
	"DIC",
] as const;

function monthLabel(isoDay: string): string {
	const month = Number(isoDay.slice(5, 7)) - 1;
	return `${MONTHS[month]} ${isoDay.slice(0, 4)}`;
}

function dayLabel(isoDay: string): string {
	const month = Number(isoDay.slice(5, 7)) - 1;
	return `${Number(isoDay.slice(8, 10))} ${MONTHS[month]}`;
}

/** Marcas de la cabecera temporal según la escala. */
export function headerTicks(scale: GanttScale, range: GanttRange): GanttTick[] {
	const ticks: GanttTick[] = [];
	if (scale === "año" || scale === "6m" || scale === "mes") {
		let cursor = monthStart(range.start);
		if (cursor < range.start) cursor = addMonths(cursor, 1);
		while (cursor <= range.end) {
			ticks.push({ iso: cursor, label: monthLabel(cursor) });
			cursor = addMonths(cursor, 1);
		}
	} else if (scale === "semana") {
		let cursor = weekStart(range.start);
		if (cursor < range.start) cursor = addDays(cursor, 7);
		while (cursor <= range.end) {
			ticks.push({ iso: cursor, label: dayLabel(cursor) });
			cursor = addDays(cursor, 7);
		}
	} else {
		let cursor = range.start;
		while (cursor <= range.end) {
			ticks.push({ iso: cursor, label: dayLabel(cursor) });
			cursor = addDays(cursor, 1);
		}
	}
	return ticks;
}

export interface GanttRow {
	item: Item;
	depth: number;
}

/** Filas ordenadas: épicas (con hijas) por fecha, luego tareas raíz. */
export function buildRows(items: Item[], scale: GanttScale): GanttRow[] {
	const byParent = new Map<number | null, Item[]>();
	for (const item of items) {
		const list = byParent.get(item.parent_id) ?? [];
		list.push(item);
		byParent.set(item.parent_id, list);
	}
	const byStart = (a: Item, b: Item) =>
		(a.start_date ?? "9999").localeCompare(b.start_date ?? "9999") ||
		a.id - b.id;

	const rows: GanttRow[] = [];
	const pushChildren = (parentId: number, depth: number) => {
		for (const child of (byParent.get(parentId) ?? []).sort(byStart)) {
			if (isVisibleAtScale(child, scale)) {
				rows.push({ item: child, depth });
				pushChildren(child.id, depth + 1);
			}
		}
	};

	const roots = (byParent.get(null) ?? []).sort(byStart);
	for (const root of roots.filter((item) => item.type === "epic")) {
		rows.push({ item: root, depth: 0 });
		pushChildren(root.id, 1);
	}
	for (const root of roots.filter((item) => item.type !== "epic")) {
		if (isVisibleAtScale(root, scale)) {
			rows.push({ item: root, depth: 0 });
			pushChildren(root.id, 1);
		}
	}
	return rows;
}
