import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client.js";

/** Estado de la sesión tal y como lo publica `GET /auth/session`. */
export interface Session {
	/** `false` si el backend corre sin login (solo desarrollo). */
	auth_enabled: boolean;
	authenticated: boolean;
	username: string | null;
}

export const SESSION_QUERY_KEY = ["session"] as const;

export function useSession() {
	return useQuery({
		queryKey: SESSION_QUERY_KEY,
		queryFn: () => apiGet<Session>("/auth/session"),
		retry: false,
		// La cookie puede caducar mientras la pestaña vive días abiertas.
		refetchOnWindowFocus: true,
		staleTime: 60_000,
	});
}

export function useLogin() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (credentials: { username: string; password: string }) =>
			apiSend<{ authenticated: boolean; username: string }>(
				"POST",
				"/auth/login",
				credentials,
			),
		onSuccess: () => {
			// Lo que se pidió sin sesión falló: se revalida todo con la cookie ya puesta.
			queryClient.invalidateQueries();
		},
	});
}

export function useLogout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => apiSend<void>("POST", "/auth/logout"),
		onSettled: () => {
			// Nada de datos del proyecto en memoria tras salir.
			queryClient.clear();
		},
	});
}
