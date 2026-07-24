import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client.js";
import type { Project } from "./types.js";

export function useProjects() {
	return useQuery({
		queryKey: ["projects"],
		queryFn: () => apiGet<Project[]>("/projects"),
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			name: string;
			key_prefix: string;
			description?: string | null;
		}) => apiSend<Project>("POST", "/projects", data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
	});
}

export function useUpdateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...patch
		}: { id: number; name?: string; description?: string | null }) =>
			apiSend<Project>("PATCH", `/projects/${id}`, patch),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => apiSend<void>("DELETE", `/projects/${id}`),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
	});
}
