import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client.js";

export interface Health {
	status: string;
}

/** Latido del backend: alimenta el indicador «api» del footer. */
export function useHealth() {
	return useQuery({
		queryKey: ["health"],
		queryFn: () => apiGet<Health>("/health"),
		refetchInterval: 30_000,
		retry: false,
	});
}
