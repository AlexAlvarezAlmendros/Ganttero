import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client.js";
import type { Item, ItemStatus } from "./types.js";

export type DerivedPriority = "late" | "now" | "normal" | "blocked" | "done";

export interface KanbanCard extends Item {
	priority: DerivedPriority;
}

export interface KanbanBoardData {
	project_id: number;
	today: string;
	window_days: number;
	columns: Record<ItemStatus, KanbanCard[]>;
}

/**
 * El tablero derivado del Gantt. El "job" de recálculo al cambiar el día
 * es innecesario: el backend deriva por petición y aquí revalidamos cada
 * minuto y al volver el foco.
 */
export function useKanban(projectId: number | null) {
	return useQuery({
		queryKey: ["kanban", projectId],
		queryFn: () => apiGet<KanbanBoardData>(`/projects/${projectId}/kanban`),
		enabled: projectId !== null,
		refetchInterval: 60_000,
		refetchOnWindowFocus: true,
	});
}
