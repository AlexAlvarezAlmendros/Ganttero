import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client.js";

/**
 * Qué sabe hacer el backend que hay detrás. El mismo frontend sirve para el
 * homeserver (con voz e IA local) y para Vercel (sin Python ni Ollama), así
 * que pregunta en vez de asumir: la UI esconde lo que no está disponible.
 */
export interface Capabilities {
	voice: boolean;
	describer: boolean;
	github: boolean;
	github_polling: boolean;
	mcp: boolean;
}

/** Mientras carga se asume lo mínimo: mejor revelar tarde que fallar pronto. */
export const NO_CAPABILITIES: Capabilities = {
	voice: false,
	describer: false,
	github: false,
	github_polling: false,
	mcp: false,
};

export function useCapabilities() {
	return useQuery({
		queryKey: ["capabilities"],
		queryFn: () => apiGet<Capabilities>("/capabilities"),
		// No cambian sin un redespliegue: no tiene sentido revalidarlas.
		staleTime: Number.POSITIVE_INFINITY,
	});
}
