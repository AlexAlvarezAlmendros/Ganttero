import type { Item } from "../items/items.schema.js";
import type { ItemsService } from "../items/items.service.js";
import type { KanbanService } from "../kanban/kanban.service.js";
import type { ProjectsService } from "../projects/projects.service.js";
import type { TimelogService } from "../timelog/timelog.service.js";
import {
	createItemInput,
	itemIdInput,
	kanbanInput,
	listItemsInput,
	setStatusInput,
	updateItemInput,
} from "./mcp.schema.js";

/**
 * Herramientas que Ganttero expone a los agentes (Claude Code y compañía):
 * leer qué hay en cada proyecto y en qué estado, crear y modificar tareas, y
 * mover el estado — que es lo que dispara el cronometraje automático.
 *
 * Cada herramienta delega en el servicio de siempre: el MCP es una fachada,
 * nunca una segunda implementación de las reglas de negocio.
 */

export interface McpDeps {
	projects: ProjectsService;
	items: ItemsService;
	kanban: KanbanService;
	timelog: TimelogService;
}

export interface McpTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	run: (deps: McpDeps, args: unknown) => Promise<unknown>;
}

/** Vista compacta de un ítem: lo que el agente necesita para decidir. */
function brief(item: Item) {
	return {
		id: item.id,
		key: item.key,
		project_id: item.project_id,
		parent_id: item.parent_id,
		type: item.type,
		title: item.title,
		status: item.status,
		start_date: item.start_date,
		end_date: item.end_date,
		estimate_min: item.estimate_min,
	};
}

const object = (
	properties: Record<string, unknown>,
	required: string[] = [],
): Record<string, unknown> => ({
	type: "object",
	properties,
	...(required.length > 0 ? { required } : {}),
	additionalProperties: false,
});

const ITEM_ID = {
	type: "number",
	description: "id interno del ítem (no la clave GP-42)",
};
const STATUS = {
	type: "string",
	enum: ["backlog", "in_progress", "blocked", "done"],
};
const DAY = { type: "string", description: "día ISO YYYY-MM-DD" };

export const MCP_TOOLS: McpTool[] = [
	{
		name: "list_projects",
		description:
			"Lista los proyectos de Ganttero con su id, nombre y prefijo de clave. Úsala primero para saber sobre qué proyecto trabajar.",
		inputSchema: object({}),
		run: async (deps) => deps.projects.list(),
	},
	{
		name: "list_items",
		description:
			"Lista las tareas (épicas, tareas y subtareas) con su estado, fechas y jerarquía. Sin project_id devuelve las de todos los proyectos. Por defecto oculta las hechas: pasa include_done para verlas.",
		inputSchema: object({
			project_id: { type: "number" },
			status: STATUS,
			type: { type: "string", enum: ["epic", "task", "subtask"] },
			include_done: { type: "boolean" },
		}),
		run: async (deps, args) => {
			const input = listItemsInput.parse(args ?? {});
			const items =
				input.project_id === undefined
					? await deps.items.listAll()
					: await deps.items.listByProject(input.project_id);
			return items
				.filter(
					(item) => input.status === undefined || item.status === input.status,
				)
				.filter((item) => input.type === undefined || item.type === input.type)
				.filter((item) => input.include_done || item.status !== "done")
				.map(brief);
		},
	},
	{
		name: "get_item",
		description:
			"Detalle completo de una tarea: descripción en markdown, fechas, tiempo registrado y sus subtareas.",
		inputSchema: object({ item_id: ITEM_ID }, ["item_id"]),
		run: async (deps, args) => {
			const { item_id } = itemIdInput.parse(args);
			const item = await deps.items.get(item_id);
			const [timelog, siblings] = await Promise.all([
				deps.timelog.summary(item.id),
				deps.items.listByProject(item.project_id),
			]);
			return {
				...item,
				time_logged_sec: timelog.total_sec,
				time_running: timelog.running,
				children: siblings
					.filter((candidate) => candidate.parent_id === item.id)
					.map(brief),
			};
		},
	},
	{
		name: "create_item",
		description:
			"Crea una épica, tarea o subtarea. La jerarquía manda: una tarea puede colgar de una épica y una subtarea debe colgar de una tarea, siempre del mismo proyecto. Sin fechas, la tarea queda en el backlog hasta que se planifique.",
		inputSchema: object(
			{
				project_id: { type: "number" },
				type: { type: "string", enum: ["epic", "task", "subtask"] },
				title: { type: "string" },
				description: { type: "string", description: "markdown" },
				parent_id: ITEM_ID,
				start_date: DAY,
				end_date: DAY,
				estimate_min: { type: "number", description: "estimación en minutos" },
			},
			["project_id", "title"],
		),
		run: async (deps, args) => {
			const input = createItemInput.parse(args);
			return brief(await deps.items.create(input));
		},
	},
	{
		name: "update_item",
		description:
			"Modifica título, descripción, fechas, estimación o de qué épica/tarea cuelga. Para cambiar el estado usa set_item_status, que además registra el tiempo.",
		inputSchema: object(
			{
				item_id: ITEM_ID,
				title: { type: "string" },
				description: { type: ["string", "null"] },
				parent_id: { type: ["number", "null"] },
				start_date: { type: ["string", "null"] },
				end_date: { type: ["string", "null"] },
				estimate_min: { type: ["number", "null"] },
			},
			["item_id"],
		),
		run: async (deps, args) => {
			const { item_id, ...patch } = updateItemInput.parse(args);
			return brief(await deps.items.update(item_id, patch));
		},
	},
	{
		name: "set_item_status",
		description:
			"Cambia el estado de una tarea (backlog · in_progress · blocked · done). Es la herramienta de seguimiento: pasar a in_progress abre un tramo de tiempo y pasar a done lo cierra, sin cronómetros manuales.",
		inputSchema: object({ item_id: ITEM_ID, status: STATUS }, [
			"item_id",
			"status",
		]),
		run: async (deps, args) => {
			const { item_id, status } = setStatusInput.parse(args);
			const updated = await deps.items.update(item_id, { status });
			const timelog = await deps.timelog.summary(updated.id);
			return {
				...brief(updated),
				time_logged_sec: timelog.total_sec,
				time_running: timelog.running,
			};
		},
	},
	{
		name: "get_kanban",
		description:
			"El tablero de lo que toca ahora, derivado del Gantt: solo lo que cruza la ventana de hoy, lo que está en curso o bloqueado y lo vencido, ya priorizado. Sin project_id agrega todos los proyectos.",
		inputSchema: object({ project_id: { type: "number" } }),
		run: async (deps, args) => {
			const { project_id } = kanbanInput.parse(args ?? {});
			const board =
				project_id === undefined
					? await deps.kanban.boardAll()
					: await deps.kanban.board(project_id);
			return {
				today: board.today,
				window_days: board.window_days,
				columns: Object.fromEntries(
					Object.entries(board.columns).map(([status, cards]) => [
						status,
						cards.map((card) => ({ ...brief(card), priority: card.priority })),
					]),
				),
			};
		},
	},
];

export const MCP_TOOLS_BY_NAME = new Map(
	MCP_TOOLS.map((tool) => [tool.name, tool]),
);
