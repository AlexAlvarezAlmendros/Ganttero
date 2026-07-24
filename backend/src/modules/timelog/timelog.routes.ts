import type { FastifyInstance } from "fastify";
import { idParamSchema } from "../items/items.schema.js";
import type { ItemsService } from "../items/items.service.js";
import type { TimelogService } from "./timelog.service.js";

export function timelogRoutes(
	service: TimelogService,
	itemsService: ItemsService,
) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.get("/items/:id/timelogs", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			await itemsService.get(id); // 404 si el ítem no existe
			return service.summary(id);
		});
	};
}
