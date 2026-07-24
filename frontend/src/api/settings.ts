import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client.js";

export interface Settings {
	kanban_window_days: number;
}

export function useSettings() {
	return useQuery({
		queryKey: ["settings"],
		queryFn: () => apiGet<Settings>("/settings"),
	});
}

export function useUpdateSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Settings) =>
			apiSend<Settings>("PATCH", "/settings", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			queryClient.invalidateQueries({ queryKey: ["kanban"] });
		},
	});
}
