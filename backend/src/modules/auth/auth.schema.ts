import { z } from "zod";

/** Nombre de la cookie de sesión (mismo origen: nginx sirve SPA + /api). */
export const SESSION_COOKIE = "ganttero_session";

export const loginSchema = z.object({
	username: z.string().min(1).max(120),
	// Tope alto pero acotado: scrypt sobre una entrada enorme sería un DoS barato.
	password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface SessionResponse {
	/** `false` cuando el backend corre sin auth (solo desarrollo). */
	auth_enabled: boolean;
	authenticated: boolean;
	username: string | null;
}
