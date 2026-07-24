import type { FastifyInstance } from "fastify";
import {
	createItemSchema,
	idParamSchema,
	improveDescriptionSchema,
	updateItemSchema,
} from "./items.schema.js";
import type { ItemsService } from "./items.service.js";

export function itemsRoutes(service: ItemsService) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.get("/projects/:id/items", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.listByProject(id);
		});

		app.get("/items/:id", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.get(id);
		});

		app.post("/items", async (request, reply) => {
			const body = createItemSchema.parse(request.body);
			const item = await service.create(body);
			return reply.status(201).send(item);
		});

		// "Mejorar formato": sin estado (no toca la DB); sirve tanto al alta
		// como a la edición antes de guardar.
		app.post("/items/improve-description", async (request) => {
			const { text } = improveDescriptionSchema.parse(request.body);
			const improved = await service.improveDescription(text);
			return { improved };
		});

		app.patch("/items/:id", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			const patch = updateItemSchema.parse(request.body);
			return service.update(id, patch);
		});

		app.delete("/items/:id", async (request, reply) => {
			const { id } = idParamSchema.parse(request.params);
			await service.remove(id);
			return reply.status(204).send();
		});
	};
}
