import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item, ItemType } from "../api/types.js";
import { BacklogView } from "./BacklogView.js";

const TODAY = "2026-08-09";

function makeItem(
	id: number,
	type: ItemType,
	overrides: Partial<Item> = {},
): Item {
	return {
		id,
		project_id: 1,
		parent_id: null,
		type,
		key: `GP-${id}`,
		title: `ítem ${id}`,
		description: null,
		status: "backlog",
		start_date: null,
		end_date: null,
		estimate_min: null,
		created_at: "2026-08-01T00:00:00.000Z",
		updated_at: "2026-08-01T00:00:00.000Z",
		...overrides,
	};
}

const items: Item[] = [
	makeItem(1, "epic", { title: "Infraestructura" }),
	makeItem(2, "task", {
		parent_id: 1,
		title: "Montar el RAID",
		start_date: "2026-08-10",
		end_date: "2026-08-12",
	}),
	makeItem(3, "task", { title: "Idea suelta" }),
	makeItem(4, "task", { status: "done", title: "Ya hecha" }),
];

function renderBacklog(onOpen = vi.fn()) {
	render(
		<BacklogView items={items} today={TODAY} windowDays={14} onOpen={onOpen} />,
	);
	return onOpen;
}

describe("BacklogView — todos los proyectos", () => {
	afterEach(cleanup);

	const projects = [
		{
			id: 1,
			name: "Ganttero",
			key_prefix: "GP",
			description: null,
			created_at: "2026-08-01T00:00:00.000Z",
			archived_at: null,
		},
		{
			id: 2,
			name: "Otro",
			key_prefix: "OT",
			description: null,
			created_at: "2026-08-01T00:00:00.000Z",
			archived_at: null,
		},
	];
	const mixed: Item[] = [
		...items,
		makeItem(5, "task", {
			project_id: 2,
			key: "OT-1",
			title: "tarea del otro",
		}),
	];

	function renderAll() {
		render(
			<BacklogView
				items={mixed}
				projects={projects}
				showProject
				today={TODAY}
				windowDays={14}
				onOpen={vi.fn()}
			/>,
		);
	}

	it("lista el trabajo de todos los proyectos con su columna PROYECTO", () => {
		renderAll();
		expect(screen.getByText("TAREAS DE TODOS LOS PROYECTOS")).toBeDefined();
		expect(screen.getByText("tarea del otro")).toBeDefined();
		expect(screen.getByText("Montar el RAID")).toBeDefined();
		expect(screen.getByText("Otro")).toBeDefined();
	});

	it("el filtro de proyecto acota la lista", () => {
		renderAll();
		fireEvent.change(screen.getByLabelText("Proyecto"), {
			target: { value: "2" },
		});
		expect(screen.getByText("tarea del otro")).toBeDefined();
		expect(screen.queryByText("Montar el RAID")).toBeNull();
		expect(screen.getByText("1 de 4")).toBeDefined();
	});
});

describe("BacklogView", () => {
	afterEach(cleanup);

	it("lista todas las tareas del proyecto, planificadas o no", () => {
		renderBacklog();
		expect(screen.getByText("Montar el RAID")).toBeDefined();
		expect(screen.getByText("Idea suelta")).toBeDefined();
		expect(screen.getByText("Ya hecha")).toBeDefined();
		expect(screen.getByText("3 en total")).toBeDefined();
	});

	it("no lista las épicas: son la dimensión del filtro, no su contenido", () => {
		renderBacklog();
		expect(screen.queryByText("Infraestructura")).toBeNull();
		// pero sí puebla el desplegable de épicas
		expect(
			screen.getByRole("option", { name: "GP-1 · Infraestructura" }),
		).toBeDefined();
	});

	it("marca lo que no tiene fechas", () => {
		renderBacklog();
		expect(screen.getAllByText("// sin planificar").length).toBe(2);
	});

	it("filtra por estado y actualiza el contador", () => {
		renderBacklog();
		fireEvent.change(screen.getByLabelText("Estado"), {
			target: { value: "done" },
		});
		expect(screen.getByText("Ya hecha")).toBeDefined();
		expect(screen.queryByText("Idea suelta")).toBeNull();
		expect(screen.getByText("1 de 3")).toBeDefined();
	});

	it("filtra por fecha: sin planificar", () => {
		renderBacklog();
		fireEvent.change(screen.getByLabelText("Fecha"), {
			target: { value: "unplanned" },
		});
		expect(screen.queryByText("Montar el RAID")).toBeNull();
		expect(screen.getByText("Idea suelta")).toBeDefined();
	});

	it("filtra por épica", () => {
		renderBacklog();
		fireEvent.change(screen.getByLabelText("Épica"), {
			target: { value: "1" },
		});
		expect(screen.getByText("Montar el RAID")).toBeDefined();
		expect(screen.queryByText("Idea suelta")).toBeNull();
	});

	it("LIMPIAR devuelve la lista completa", () => {
		renderBacklog();
		const limpiar = screen.getByRole("button", { name: "LIMPIAR" });
		expect((limpiar as HTMLButtonElement).disabled).toBe(true);
		fireEvent.change(screen.getByLabelText("Estado"), {
			target: { value: "done" },
		});
		expect((limpiar as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(limpiar);
		expect(screen.getByText("3 en total")).toBeDefined();
	});

	it("avisa cuando ninguna tarea pasa los filtros", () => {
		renderBacklog();
		fireEvent.change(screen.getByLabelText("Fecha"), {
			target: { value: "overdue" },
		});
		expect(screen.getByText("// ninguna tarea pasa los filtros")).toBeDefined();
	});

	it("sin showProject no hay ni columna ni filtro de proyecto", () => {
		renderBacklog();
		expect(screen.queryByLabelText("Proyecto")).toBeNull();
		expect(screen.getByText("TAREAS DEL PROYECTO")).toBeDefined();
	});

	it("abre el detalle al hacer clic en una fila", () => {
		const onOpen = renderBacklog();
		fireEvent.click(screen.getByText("Montar el RAID"));
		expect(onOpen).toHaveBeenCalledWith(items[1]);
	});
});
