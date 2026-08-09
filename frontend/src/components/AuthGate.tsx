import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { SESSION_QUERY_KEY, useSession } from "../api/auth.js";
import { UNAUTHORIZED_EVENT } from "../api/client.js";
import { LoginPage } from "./LoginPage.js";
import { MicroLabel } from "./ds/MicroLabel.js";

/**
 * Puerta de la SPA: la app no se monta sin sesión, así que ningún hook de datos
 * llega a pedir nada al backend antes de tiempo. Un 401 en cualquier petición
 * (sesión caducada mientras la pestaña estaba abierta) revalida la sesión y
 * devuelve al login.
 */
export function AuthGate({ children }: { children: ReactNode }) {
	const session = useSession();
	const queryClient = useQueryClient();

	useEffect(() => {
		const onUnauthorized = () => {
			queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
		};
		window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
		return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
	}, [queryClient]);

	if (session.isPending) {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<MicroLabel>{"// comprobando sesión…"}</MicroLabel>
			</div>
		);
	}

	// Si `/auth/session` no responde, el login es la única salida sensata: sin
	// backend tampoco habría datos que enseñar.
	if (!session.data || !session.data.authenticated) {
		return <LoginPage />;
	}

	return <>{children}</>;
}
