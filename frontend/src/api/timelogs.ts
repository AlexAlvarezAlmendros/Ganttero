import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client.js";
import type { TimelogSummary } from "./types.js";

export function useTimelog(itemId: number | null) {
	return useQuery({
		queryKey: ["timelog", itemId],
		queryFn: () => apiGet<TimelogSummary>(`/items/${itemId}/timelogs`),
		enabled: itemId !== null,
		refetchInterval: 30_000, // el tramo abierto avanza
	});
}
