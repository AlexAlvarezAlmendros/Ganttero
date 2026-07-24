import type { FastifyInstance } from "fastify";
import { idParamSchema } from "../items/items.schema.js";
import type { KanbanService } from "./kanban.service.js";

export function kanbanRoutes(service: KanbanService) {
	return async function routes(app: FastifyInstance): Promise<void> {
		/** El tablero se deriva en cada petición: siempre fresco, nada persistido. */
		app.get("/projects/:id/kanban", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.board(id);
		});
	};
}
