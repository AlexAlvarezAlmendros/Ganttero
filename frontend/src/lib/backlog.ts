import type { Item, ItemStatus } from "../api/types.js";
import { addDays } from "./gantt.js";

/**
 * Backlog: la lista COMPLETA de tareas del proyecto — planificadas y sin
 * planificar, dentro y fuera de la ventana del Kanban. Es la única vista que
 * no esconde nada; el Kanban sigue siendo la derivada del Gantt.
 *
 * Lógica pura y con "hoy" SIEMPRE inyectado (nunca new Date() aquí dentro).
 * Las épicas no son filas: contienen trabajo, no se ejecutan (misma regla que
 * el tablero) — por eso son la dimensión del filtro, no su contenido.
 */

export type DateFilter = "all" | "unplanned" | "planned" | "window" | "overdue";

export const DATE_FILTERS: Array<{ value: DateFilter; label: string }> = [
	{ value: "all", label: "TODAS" },
	{ value: "unplanned", label: "SIN PLANIFICAR" },
	{ value: "planned", label: "PLANIFICADAS" },
	{ value: "window", label: "EN LA VENTANA" },
	{ value: "overdue", label: "VENCIDAS" },
];

export interface BacklogFilters {
	status: ItemStatus | "all";
	/** Solo aplica en la vista de todos los proyectos. */
	project: number | "all";
	date: DateFilter;
	/** Épica: `all` todas · `none` sin épica · id de la épica. */
	epic: number | "all" | "none";
	/** Rango libre en días ISO; cadena vacía = sin límite por ese lado. */
	from: string;
	to: string;
}

export const NO_FILTERS: BacklogFilters = {
	status: "all",
	project: "all",
	date: "all",
	epic: "all",
	from: "",
	to: "",
};

export function hasActiveFilters(filters: BacklogFilters): boolean {
	return (
		filters.status !== "all" ||
		filters.project !== "all" ||
		filters.date !== "all" ||
		filters.epic !== "all" ||
		filters.from !== "" ||
		filters.to !== ""
	);
}

/** Rango efectivo: si falta un extremo, el otro lo suple (igual que el Kanban). */
export function effectiveRange(
	item: Item,
): { start: string; end: string } | null {
	const start = item.start_date ?? item.end_date;
	const end = item.end_date ?? item.start_date;
	return start && end ? { start, end } : null;
}

/**
 * Épica a la que pertenece el ítem: directa para una tarea, la del padre para
 * una subtarea. `null` si cuelga de la raíz.
 */
export function epicIdOf(item: Item, byId: Map<number, Item>): number | null {
	let cursor: Item | undefined = item;
	const seen = new Set<number>();
	while (cursor && !seen.has(cursor.id)) {
		seen.add(cursor.id);
		if (cursor.type === "epic") return cursor.id;
		cursor = cursor.parent_id !== null ? byId.get(cursor.parent_id) : undefined;
	}
	return null;
}

function matchesDate(
	item: Item,
	filter: DateFilter,
	today: string,
	windowDays: number,
): boolean {
	const range = effectiveRange(item);
	switch (filter) {
		case "unplanned":
			return range === null;
		case "planned":
			return range !== null;
		case "window":
			return (
				range !== null &&
				range.start <= addDays(today, windowDays) &&
				range.end >= today
			);
		case "overdue":
			return range !== null && range.end < today && item.status !== "done";
		default:
			return true;
	}
}

/** Rango libre: se queda el ítem cuyo tramo se solapa con [from, to]. */
function matchesBounds(item: Item, from: string, to: string): boolean {
	if (!from && !to) return true;
	const range = effectiveRange(item);
	// Sin fechas no se puede afirmar que caiga dentro: un rango explícito lo excluye.
	if (!range) return false;
	if (from && range.end < from) return false;
	if (to && range.start > to) return false;
	return true;
}

/** Épicas del proyecto, ordenadas por clave, para poblar el filtro. */
export function epicsOf(items: Item[]): Item[] {
	return items
		.filter((item) => item.type === "epic")
		.sort((a, b) => a.key.localeCompare(b.key, "es", { numeric: true }));
}

/**
 * Aplica los filtros y ordena: primero lo planificado por fecha de inicio
 * efectiva, y al final lo que aún no tiene "cuándo".
 */
export function filterBacklog(
	items: Item[],
	filters: BacklogFilters,
	today: string,
	windowDays: number,
): Item[] {
	const byId = new Map(items.map((item) => [item.id, item]));
	return items
		.filter((item) => item.type !== "epic")
		.filter(
			(item) => filters.status === "all" || item.status === filters.status,
		)
		.filter(
			(item) =>
				filters.project === "all" || item.project_id === filters.project,
		)
		.filter((item) => matchesDate(item, filters.date, today, windowDays))
		.filter((item) => matchesBounds(item, filters.from, filters.to))
		.filter((item) => {
			if (filters.epic === "all") return true;
			const epic = epicIdOf(item, byId);
			return filters.epic === "none" ? epic === null : epic === filters.epic;
		})
		.sort((a, b) => {
			const startA = effectiveRange(a)?.start ?? "9999";
			const startB = effectiveRange(b)?.start ?? "9999";
			return (
				startA.localeCompare(startB) ||
				a.key.localeCompare(b.key, "es", { numeric: true })
			);
		});
}
