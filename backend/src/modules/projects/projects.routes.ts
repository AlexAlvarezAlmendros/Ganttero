import type { FastifyInstance } from "fastify";
import {
	createProjectSchema,
	idParamSchema,
	updateProjectSchema,
} from "./projects.schema.js";
import type { ProjectsService } from "./projects.service.js";

/** HTTP puro: parseo con Zod, llamada al service y respuesta. */
export function projectsRoutes(service: ProjectsService) {
	return async function routes(app: FastifyInstance): Promise<void> {
		app.get("/projects", async () => service.list());

		app.get("/projects/:id", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			return service.get(id);
		});

		app.post("/projects", async (request, reply) => {
			const body = createProjectSchema.parse(request.body);
			const project = await service.create(body);
			return reply.status(201).send(project);
		});

		app.patch("/projects/:id", async (request) => {
			const { id } = idParamSchema.parse(request.params);
			const patch = updateProjectSchema.parse(request.body);
			return service.update(id, patch);
		});

		app.delete("/projects/:id", async (request, reply) => {
			const { id } = idParamSchema.parse(request.params);
			await service.remove(id);
			return reply.status(204).send();
		});
	};
}
