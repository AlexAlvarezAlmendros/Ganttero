import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client.js";

export interface GithubLink {
	id: number;
	project_id: number;
	repo_full_name: string;
	created_at: string;
}

export interface ItemCommit {
	id: number;
	item_id: number;
	sha: string;
	message: string;
	url: string;
	committed_at: string;
}

export interface GithubStatus {
	token_configured: boolean;
	poll_seconds: number;
}

export function useGithubLinks(projectId: number | null) {
	return useQuery({
		queryKey: ["github-links", projectId],
		queryFn: () => apiGet<GithubLink[]>(`/projects/${projectId}/github`),
		enabled: projectId !== null,
	});
}

export function useLinkRepo() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ projectId, repo }: { projectId: number; repo: string }) =>
			apiSend<GithubLink>("POST", `/projects/${projectId}/github`, {
				repo_full_name: repo,
			}),
		onSuccess: (link) =>
			queryClient.invalidateQueries({
				queryKey: ["github-links", link.project_id],
			}),
	});
}

export function useUnlinkRepo() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ linkId }: { linkId: number; projectId: number }) =>
			apiSend<void>("DELETE", `/github/links/${linkId}`),
		onSuccess: (_data, variables) =>
			queryClient.invalidateQueries({
				queryKey: ["github-links", variables.projectId],
			}),
	});
}

export function useItemCommits(itemId: number | null) {
	return useQuery({
		queryKey: ["item-commits", itemId],
		queryFn: () => apiGet<ItemCommit[]>(`/items/${itemId}/commits`),
		enabled: itemId !== null,
	});
}

export function useGithubStatus() {
	return useQuery({
		queryKey: ["github-status"],
		queryFn: () => apiGet<GithubStatus>("/github/status"),
	});
}
