import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client.js";
import type { ProjectScope } from "./items.js";
import type { Item, ItemStatus } from "./types.js";

export type DerivedPriority = "late" | "now" | "normal" | "blocked" | "done";

export interface KanbanCard extends Item {
	priority: DerivedPriority;
}

export interface KanbanBoardData {
	/** `null` = tablero de todos los proyectos. */
	project_id: number | null;
	today: string;
	window_days: number;
	columns: Record<ItemStatus, KanbanCard[]>;
}

/**
 * El tablero derivado del Gantt. El "job" de recálculo al cambiar el día
 * es innecesario: el backend deriva por petición y aquí revalidamos cada
 * minuto y al volver el foco.
 */
export function useKanban(scope: ProjectScope | null) {
	return useQuery({
		queryKey: ["kanban", scope],
		queryFn: () =>
			apiGet<KanbanBoardData>(
				scope === "all" ? "/kanban" : `/projects/${scope}/kanban`,
			),
		enabled: scope !== null,
		refetchInterval: 60_000,
		refetchOnWindowFocus: true,
	});
}
