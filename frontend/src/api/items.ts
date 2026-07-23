import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client.js";
import type { Item, ItemStatus, ItemType } from "./types.js";

export function useItems(projectId: number | null) {
	return useQuery({
		queryKey: ["items", projectId],
		queryFn: () => apiGet<Item[]>(`/projects/${projectId}/items`),
		enabled: projectId !== null,
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
		onSuccess: (item) =>
			queryClient.invalidateQueries({ queryKey: ["items", item.project_id] }),
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
			queryClient.invalidateQueries({ queryKey: ["items", item.project_id] });
			queryClient.invalidateQueries({ queryKey: ["timelog", item.id] });
		},
	});
}

export function useDeleteItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id }: { id: number; project_id: number }) =>
			apiSend<void>("DELETE", `/items/${id}`),
		onSuccess: (_data, variables) =>
			queryClient.invalidateQueries({
				queryKey: ["items", variables.project_id],
			}),
	});
}
