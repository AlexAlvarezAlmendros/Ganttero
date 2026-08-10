import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../build-app.js";
import { createDbClient } from "../../db/client.js";
import { migrateUp } from "../../db/migrations.js";
import { migrations } from "../../db/migrations/index.js";
import { hashPassword } from "../auth/auth.password.js";
import { AuthService } from "../auth/auth.service.js";
import { MCP_PROTOCOL_VERSION } from "./mcp.schema.js";

const TOKEN = "token-de-pruebas-con-mas-de-32-caracteres-largo";
const clock = new Date("2026-07-23T10:00:00.000Z");

describe("endpoint MCP (Streamable HTTP)", () => {
	let app: FastifyInstance;
	let projectId: number;

	beforeEach(async () => {
		const db = await createDbClient(":memory:");
		await migrateUp(db, migrations, { now: () => clock });
		app = buildApp({ db, now: () => clock, mcp: { token: TOKEN } });
		projectId = (
			await app.inject({
				method: "POST",
				url: "/projects",
				payload: { name: "Ganttero", key_prefix: "GP" },
			})
		).json().id;
	});

	/** Una petición JSON-RPC con el bearer puesto. */
	function rpc(method: string, params?: unknown, id: number | null = 1) {
		return app.inject({
			method: "POST",
			url: "/mcp",
			headers: { authorization: `Bearer ${TOKEN}` },
			payload: {
				jsonrpc: "2.0",
				...(id === null ? {} : { id }),
				method,
				...(params === undefined ? {} : { params }),
			},
		});
	}

	/** Llama una herramienta y devuelve su salida ya parseada. */
	async function callTool(name: string, args?: unknown) {
		const response = await rpc("tools/call", { name, arguments: args });
		const result = response.json().result;
		return {
			isError: result.isError as boolean,
			text: result.content[0].text as string,
			get data() {
				return JSON.parse(result.content[0].text);
			},
		};
	}

	async function createTask(payload: Record<string, unknown>) {
		return (
			await app.inject({
				method: "POST",
				url: "/items",
				payload: { project_id: projectId, type: "task", ...payload },
			})
		).json();
	}

	describe("autenticación", () => {
		it("rechaza sin bearer", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				payload: { jsonrpc: "2.0", id: 1, method: "ping" },
			});
			expect(response.statusCode).toBe(401);
		});

		it("rechaza un bearer incorrecto", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				headers: { authorization: "Bearer no-es-el-token-correcto-pero-largo" },
				payload: { jsonrpc: "2.0", id: 1, method: "ping" },
			});
			expect(response.statusCode).toBe(401);
		});

		it("sin token configurado la ruta no existe", async () => {
			const db = await createDbClient(":memory:");
			await migrateUp(db, migrations, { now: () => clock });
			const sinMcp = buildApp({ db, now: () => clock });
			const response = await sinMcp.inject({
				method: "POST",
				url: "/mcp",
				headers: { authorization: `Bearer ${TOKEN}` },
				payload: { jsonrpc: "2.0", id: 1, method: "ping" },
			});
			expect(response.statusCode).toBe(404);
		});

		it("solo acepta POST", async () => {
			const response = await app.inject({ method: "GET", url: "/mcp" });
			expect(response.statusCode).toBe(405);
			expect(response.headers.allow).toBe("POST");
		});
	});

	describe("convivencia con la sesión de la Fase 9", () => {
		/** App con auth de usuario Y endpoint MCP: dos puertas independientes. */
		async function appConAuthYMcp(): Promise<FastifyInstance> {
			const db = await createDbClient(":memory:");
			await migrateUp(db, migrations, { now: () => clock });
			const passwordHash = await hashPassword("contraseña-de-prueba");
			const service = new AuthService(
				{
					username: "poio",
					passwordHash,
					secret: "secreto-de-pruebas-con-mas-de-32-caracteres",
					sessionDays: 30,
				},
				() => clock,
			);
			return buildApp({
				db,
				now: () => clock,
				auth: { service, cookieSecure: false },
				mcp: { token: TOKEN },
			});
		}

		it("el bearer entra sin cookie de sesión", async () => {
			const conAuth = await appConAuthYMcp();
			const response = await conAuth.inject({
				method: "POST",
				url: "/mcp",
				headers: { authorization: `Bearer ${TOKEN}` },
				payload: { jsonrpc: "2.0", id: 1, method: "ping" },
			});
			expect(response.statusCode).toBe(200);
		});

		it("sin bearer no vale: la exención del hook no abre la ruta", async () => {
			const conAuth = await appConAuthYMcp();
			const response = await conAuth.inject({
				method: "POST",
				url: "/mcp",
				payload: { jsonrpc: "2.0", id: 1, method: "ping" },
			});
			expect(response.statusCode).toBe(401);
		});

		it("el resto de la API sigue exigiendo la cookie", async () => {
			const conAuth = await appConAuthYMcp();
			const response = await conAuth.inject({
				method: "GET",
				url: "/projects",
				headers: { authorization: `Bearer ${TOKEN}` },
			});
			// El bearer del MCP no es una llave maestra de la API REST.
			expect(response.statusCode).toBe(401);
		});
	});

	describe("protocolo", () => {
		it("responde el handshake initialize", async () => {
			const body = (await rpc("initialize")).json();
			expect(body.jsonrpc).toBe("2.0");
			expect(body.result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
			expect(body.result.serverInfo.name).toBe("ganttero");
			expect(body.result.capabilities.tools).toBeDefined();
		});

		it("acusa las notificaciones con 202 y sin cuerpo", async () => {
			const response = await rpc("notifications/initialized", undefined, null);
			expect(response.statusCode).toBe(202);
			expect(response.body).toBe("");
		});

		it("lista las herramientas con su esquema de entrada", async () => {
			const { tools } = (await rpc("tools/list")).json().result;
			const names = tools.map((tool: { name: string }) => tool.name);
			expect(names).toEqual([
				"list_projects",
				"list_items",
				"get_item",
				"create_item",
				"update_item",
				"set_item_status",
				"get_kanban",
			]);
			for (const tool of tools) {
				expect(tool.description.length).toBeGreaterThan(20);
				expect(tool.inputSchema.type).toBe("object");
			}
		});

		it("un método desconocido devuelve error JSON-RPC", async () => {
			const body = (await rpc("resources/list")).json();
			expect(body.error.code).toBe(-32601);
		});

		it("procesa un lote y responde en lote", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				headers: { authorization: `Bearer ${TOKEN}` },
				payload: [
					{ jsonrpc: "2.0", id: 1, method: "ping" },
					{ jsonrpc: "2.0", id: 2, method: "tools/list" },
				],
			});
			const body = response.json();
			expect(Array.isArray(body)).toBe(true);
			expect(body.map((entry: { id: number }) => entry.id)).toEqual([1, 2]);
		});

		it("un cuerpo que no es JSON-RPC devuelve 400", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				headers: { authorization: `Bearer ${TOKEN}` },
				payload: { hola: "mundo" },
			});
			expect(response.statusCode).toBe(400);
			expect(response.json().error.code).toBe(-32600);
		});
	});

	describe("herramientas de lectura", () => {
		it("list_projects devuelve los proyectos", async () => {
			const { data } = await callTool("list_projects");
			expect(data).toHaveLength(1);
			expect(data[0].key_prefix).toBe("GP");
		});

		it("list_items oculta las hechas salvo que se pidan", async () => {
			await createTask({ title: "viva" });
			const hecha = await createTask({ title: "hecha" });
			await app.inject({
				method: "PATCH",
				url: `/items/${hecha.id}`,
				payload: { status: "done" },
			});

			const porDefecto = await callTool("list_items");
			expect(porDefecto.data.map((i: { title: string }) => i.title)).toEqual([
				"viva",
			]);

			const conHechas = await callTool("list_items", { include_done: true });
			expect(conHechas.data).toHaveLength(2);
		});

		it("list_items filtra por proyecto, estado y tipo", async () => {
			await createTask({ title: "tarea" });
			await app.inject({
				method: "POST",
				url: "/items",
				payload: { project_id: projectId, type: "epic", title: "épica" },
			});

			const soloEpicas = await callTool("list_items", {
				project_id: projectId,
				type: "epic",
			});
			expect(soloEpicas.data.map((i: { title: string }) => i.title)).toEqual([
				"épica",
			]);
		});

		it("get_item incluye el tiempo registrado y las subtareas", async () => {
			const tarea = await createTask({ title: "madre" });
			await app.inject({
				method: "POST",
				url: "/items",
				payload: {
					project_id: projectId,
					type: "subtask",
					title: "hija",
					parent_id: tarea.id,
				},
			});

			const { data } = await callTool("get_item", { item_id: tarea.id });
			expect(data.key).toBe(tarea.key);
			expect(data.time_logged_sec).toBe(0);
			expect(data.children.map((c: { title: string }) => c.title)).toEqual([
				"hija",
			]);
		});

		it("get_kanban devuelve el tablero derivado con prioridad", async () => {
			await createTask({
				title: "vencida",
				start_date: "2026-07-01",
				end_date: "2026-07-10",
			});
			const { data } = await callTool("get_kanban", { project_id: projectId });
			expect(data.today).toBe("2026-07-23");
			expect(data.columns.backlog[0].priority).toBe("late");
		});
	});

	describe("herramientas de escritura", () => {
		it("create_item crea la tarea y devuelve su clave", async () => {
			const { data } = await callTool("create_item", {
				project_id: projectId,
				title: "desde el agente",
				estimate_min: 45,
			});
			expect(data.key).toBe("GP-1");
			expect(data.status).toBe("backlog");
			expect(data.estimate_min).toBe(45);
		});

		it("update_item cambia campos y respeta la jerarquía", async () => {
			const epica = (
				await app.inject({
					method: "POST",
					url: "/items",
					payload: { project_id: projectId, type: "epic", title: "épica" },
				})
			).json();
			const tarea = await createTask({ title: "suelta" });

			const { data } = await callTool("update_item", {
				item_id: tarea.id,
				title: "reasignada",
				parent_id: epica.id,
			});
			expect(data.title).toBe("reasignada");
			expect(data.parent_id).toBe(epica.id);
		});

		it("set_item_status abre y cierra el cronometraje", async () => {
			const tarea = await createTask({ title: "cronometrada" });

			const enCurso = await callTool("set_item_status", {
				item_id: tarea.id,
				status: "in_progress",
			});
			expect(enCurso.data.status).toBe("in_progress");
			expect(enCurso.data.time_running).toBe(true);

			const hecha = await callTool("set_item_status", {
				item_id: tarea.id,
				status: "done",
			});
			expect(hecha.data.status).toBe("done");
			expect(hecha.data.time_running).toBe(false);
		});
	});

	describe("errores de herramienta", () => {
		it("una herramienta inexistente es error de protocolo", async () => {
			const body = (
				await rpc("tools/call", { name: "borrar_todo", arguments: {} })
			).json();
			expect(body.error.code).toBe(-32601);
		});

		it("parámetros inválidos vuelven como isError, no como fallo de protocolo", async () => {
			const { isError, text } = await callTool("create_item", { title: "" });
			expect(isError).toBe(true);
			expect(text).toContain("parámetros inválidos");
		});

		it("una regla de negocio rota vuelve como isError con su motivo", async () => {
			const epica = (
				await app.inject({
					method: "POST",
					url: "/items",
					payload: { project_id: projectId, type: "epic", title: "épica" },
				})
			).json();

			const { isError, text } = await callTool("create_item", {
				project_id: projectId,
				type: "subtask",
				title: "mal colgada",
				parent_id: epica.id,
			});
			expect(isError).toBe(true);
			expect(text).toContain("subtarea");
		});

		it("un ítem inexistente vuelve como isError", async () => {
			const { isError, text } = await callTool("get_item", { item_id: 9999 });
			expect(isError).toBe(true);
			expect(text).toContain("no existe");
		});
	});
});
