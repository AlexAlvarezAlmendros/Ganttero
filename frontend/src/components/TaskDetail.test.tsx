import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item, ItemType } from "../api/types.js";
import { TaskDetail } from "./TaskDetail.js";

function makeItem(
	id: number,
	type: ItemType,
	parent_id: number | null = null,
): Item {
	return {
		id,
		project_id: 1,
		parent_id,
		type,
		key: `GP-${id}`,
		title: `ítem ${id}`,
		description: null,
		status: "backlog",
		start_date: null,
		end_date: null,
		estimate_min: null,
		created_at: "2026-08-09T00:00:00.000Z",
		updated_at: "2026-08-09T00:00:00.000Z",
	};
}

const epicA = makeItem(1, "epic");
const epicB = makeItem(2, "epic");
const task = makeItem(3, "task", 1);
const subtask = makeItem(4, "subtask", 3);
const items = [epicA, epicB, task, subtask];

function renderDetail(item: Item, onSave = vi.fn()) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	render(
		<QueryClientProvider client={client}>
			<TaskDetail
				task={item}
				items={items}
				onClose={vi.fn()}
				onStatus={vi.fn()}
				onSave={onSave}
				onDelete={vi.fn()}
			/>
		</QueryClientProvider>,
	);
	return onSave;
}

function save() {
	fireEvent.click(screen.getByRole("button", { name: "GUARDAR" }));
}

describe("TaskDetail — reasignar el padre", () => {
	beforeEach(() => {
		// El detalle consulta tiempo registrado y commits; aquí no interesan.
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify([]), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		cleanup();
	});

	it("muestra la épica actual de la tarea", () => {
		renderDetail(task);
		const select = screen.getByLabelText(
			"Épica (opcional)",
		) as HTMLSelectElement;
		expect(select.value).toBe("1");
		expect(Array.from(select.options).map((option) => option.value)).toEqual([
			"",
			"1",
			"2",
		]);
	});

	it("guarda el cambio de épica en el patch", () => {
		const onSave = renderDetail(task);
		fireEvent.change(screen.getByLabelText("Épica (opcional)"), {
			target: { value: "2" },
		});
		save();
		expect(onSave).toHaveBeenCalledWith(
			task,
			expect.objectContaining({ parent_id: 2 }),
		);
	});

	it("permite dejar la tarea sin épica", () => {
		const onSave = renderDetail(task);
		fireEvent.change(screen.getByLabelText("Épica (opcional)"), {
			target: { value: "" },
		});
		save();
		expect(onSave).toHaveBeenCalledWith(
			task,
			expect.objectContaining({ parent_id: null }),
		);
	});

	it("una subtarea elige tarea madre y no puede quedarse sin ella", () => {
		const onSave = renderDetail(subtask);
		const select = screen.getByLabelText("Tarea madre") as HTMLSelectElement;
		expect(select.value).toBe("3");
		fireEvent.change(select, { target: { value: "" } });
		expect(
			(screen.getByRole("button", { name: "GUARDAR" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		save();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("en la vista de todos los proyectos no ofrece épicas de otro proyecto", () => {
		const otherEpic = makeItem(9, "epic", null);
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		render(
			<QueryClientProvider client={client}>
				<TaskDetail
					task={task}
					items={[...items, { ...otherEpic, project_id: 2, key: "OT-1" }]}
					onClose={vi.fn()}
					onStatus={vi.fn()}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</QueryClientProvider>,
		);
		const select = screen.getByLabelText(
			"Épica (opcional)",
		) as HTMLSelectElement;
		expect(Array.from(select.options).map((option) => option.value)).toEqual([
			"",
			"1",
			"2",
		]);
	});

	it("una épica no ofrece selector de padre y no lo manda en el patch", () => {
		const onSave = renderDetail(epicA);
		expect(screen.queryByLabelText(/épica|tarea madre/i)).toBeNull();
		save();
		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave.mock.calls[0]?.[1]).not.toHaveProperty("parent_id");
	});
});
