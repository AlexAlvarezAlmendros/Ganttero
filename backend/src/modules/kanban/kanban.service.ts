import { NotFoundError } from "../../lib/errors.js";
import type { ItemsRepo } from "../items/items.repo.js";
import type { Item, ItemStatus } from "../items/items.schema.js";
import type { ProjectsRepo } from "../projects/projects.repo.js";
import type { SettingsRepo } from "../settings/settings.repo.js";
import type {
	DerivedPriority,
	KanbanBoard,
	KanbanCard,
} from "./kanban.schema.js";

/**
 * EL PILAR DEL PRODUCTO — automatización Gantt → Kanban.
 *
 * El Gantt es la fuente de verdad del *cuándo*; el Kanban se DERIVA aquí
 * en cada petición (nada se persiste, no hay job que mantener: al cambiar
 * el día, la siguiente petición ya ve el mundo nuevo).
 *
 * Reglas (functional.md §4 / CLAUDE.md):
 * - Entra en el tablero el ítem cuyo [start,end] cruza [hoy, hoy+ventana],
 *   o que esté in_progress/blocked, o RETRASADO (end < hoy sin hacer):
 *   una tarea vencida jamás desaparece del tablero.
 * - Prioridad derivada: done → done · blocked → blocked ·
 *   end < hoy → late · start ≤ mañana → now · resto → normal.
 * - Las épicas no son tarjetas: contienen, no se ejecutan.
 */

const DAY_MS = 86_400_000;

function addDaysIso(isoDay: string, days: number): string {
	return new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * DAY_MS)
		.toISOString()
		.slice(0, 10);
}

/**
 * Día de calendario LOCAL del servidor (no UTC). Las fechas de los ítems
 * son días naïve que el usuario piensa en su zona horaria: derivar "hoy"
 * con toISOString() desplazaría todo el tablero un día entre la medianoche
 * local y la de UTC (hallazgo de la verificación adversaria de la Fase 4).
 */
export function localDayIso(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/** Rango efectivo del ítem: si falta un extremo, el otro lo suple. */
function effectiveRange(item: Item): { start: string; end: string } | null {
	const start = item.start_date ?? item.end_date;
	const end = item.end_date ?? item.start_date;
	return start && end ? { start, end } : null;
}

export function isInWindow(
	item: Item,
	today: string,
	windowDays: number,
): boolean {
	const range = effectiveRange(item);
	if (!range) return false;
	const windowEnd = addDaysIso(today, windowDays);
	return range.start <= windowEnd && range.end >= today;
}

export function isOverdue(item: Item, today: string): boolean {
	const range = effectiveRange(item);
	return item.status !== "done" && range !== null && range.end < today;
}

export function derivePriority(item: Item, today: string): DerivedPriority {
	if (item.status === "done") return "done";
	if (item.status === "blocked") return "blocked";
	const range = effectiveRange(item);
	if (!range) return "normal";
	if (range.end < today) return "late";
	if (range.start <= addDaysIso(today, 1)) return "now";
	return "normal";
}

const PRIORITY_ORDER: Record<DerivedPriority, number> = {
	late: 0,
	now: 1,
	normal: 2,
	blocked: 1,
	done: 3,
};

export function deriveBoard(
	items: Item[],
	today: string,
	windowDays: number,
): Record<ItemStatus, KanbanCard[]> {
	const cards = items
		.filter((item) => item.type !== "epic")
		.filter(
			(item) =>
				item.status === "in_progress" ||
				item.status === "blocked" ||
				isInWindow(item, today, windowDays) ||
				isOverdue(item, today),
		)
		.map((item) => ({ ...item, priority: derivePriority(item, today) }));

	// Deadline EFECTIVO (coherente con effectiveRange): sin end_date, el
	// start_date hace de fin — si no, una tarjeta solo-con-start vencida
	// desde junio ordenaría detrás de una vencida ayer.
	const deadline = (card: KanbanCard) =>
		card.end_date ?? card.start_date ?? "9999";
	const byUrgency = (a: KanbanCard, b: KanbanCard) =>
		PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
		deadline(a).localeCompare(deadline(b)) ||
		a.id - b.id;

	const columns: Record<ItemStatus, KanbanCard[]> = {
		backlog: [],
		in_progress: [],
		blocked: [],
		done: [],
	};
	for (const card of cards.sort(byUrgency)) {
		columns[card.status].push(card);
	}
	return columns;
}

export class KanbanService {
	constructor(
		private readonly itemsRepo: ItemsRepo,
		private readonly projectsRepo: ProjectsRepo,
		private readonly settingsRepo: SettingsRepo,
		/** "Hoy" SIEMPRE inyectado: el reloj entra por el constructor. */
		private readonly now: () => Date = () => new Date(),
	) {}

	async board(projectId: number): Promise<KanbanBoard> {
		const project = await this.projectsRepo.getById(projectId);
		if (!project) {
			throw new NotFoundError(`proyecto ${projectId} no existe`);
		}
		return this.derive(
			projectId,
			await this.itemsRepo.listByProject(projectId),
		);
	}

	/**
	 * Tablero de TODOS los proyectos: mismas reglas de ventana y prioridad
	 * (la ventana es un ajuste global), solo cambia el conjunto de entrada.
	 */
	async boardAll(): Promise<KanbanBoard> {
		return this.derive(null, await this.itemsRepo.listAll());
	}

	private async derive(
		projectId: number | null,
		items: Item[],
	): Promise<KanbanBoard> {
		const settings = await this.settingsRepo.get();
		const today = localDayIso(this.now());
		return {
			project_id: projectId,
			today,
			window_days: settings.kanban_window_days,
			columns: deriveBoard(items, today, settings.kanban_window_days),
		};
	}
}
