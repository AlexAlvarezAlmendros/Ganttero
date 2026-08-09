import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client.js";
import type { Item, ItemStatus, ItemType } from "./types.js";

/** Proyecto activo: un id, o `"all"` para la vista de todos los proyectos. */
export type ProjectScope = number | "all";

export function useItems(scope: ProjectScope | null) {
	return useQuery({
		queryKey: ["items", scope],
		queryFn: () =>
			apiGet<Item[]>(scope === "all" ? "/items" : `/projects/${scope}/items`),
		enabled: scope !== null,
	});
}

export interface CreateItemInput {
	project_id: number;
	parent_id?: number | null;
	type: ItemType;
	title: string;
	description?: string | null;
	start_date?: string | null;
	end_date?: string | null;
	estimate_min?: number | null;
}

export function useCreateItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateItemInput) =>
			apiSend<Item>("POST", "/items", data),
		onSuccess: () => {
			// Prefijo, sin el id: el mismo ítem vive en la caché de su proyecto
			// y en la de "todos los proyectos".
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["kanban"] });
		},
	});
}

export interface UpdateItemInput {
	id: number;
	title?: string;
	description?: string | null;
	status?: ItemStatus;
	parent_id?: number | null;
	start_date?: string | null;
	end_date?: string | null;
	estimate_min?: number | null;
}

export function useUpdateItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...patch }: UpdateItemInput) =>
			apiSend<Item>("PATCH", `/items/${id}`, patch),
		onSuccess: (item) => {
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["kanban"] });
			queryClient.invalidateQueries({ queryKey: ["timelog", item.id] });
		},
	});
}

/**
 * "Mejorar formato": manda la descripción a la IA local (Ollama/Gemma) y
 * devuelve markdown reestructurado y enriquecido. Sin estado: no toca la DB,
 * sirve tanto al alta como a la edición antes de guardar.
 */
export function useImproveDescription() {
	return useMutation({
		mutationFn: (text: string) =>
			apiSend<{ improved: string }>("POST", "/items/improve-description", {
				text,
			}),
	});
}

export function useDeleteItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id }: { id: number; project_id: number }) =>
			apiSend<void>("DELETE", `/items/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["kanban"] });
		},
	});
}
