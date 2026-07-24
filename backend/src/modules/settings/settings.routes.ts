import type { FastifyInstance } from "fastify";
import type { SettingsRepo } from "./settings.repo.js";
import { updateSettingsSchema } from "./settings.schema.js";

/** Ajustes globales: sin lógica de negocio, el repo basta como "service". */
export function settingsRoutes(repo: SettingsRepo) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.get("/settings", async () => repo.get());

		app.patch("/settings", async (request) => {
			const body = updateSettingsSchema.parse(request.body);
			return repo.update(body);
		});
	};
}
