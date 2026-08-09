import { describe, expect, it } from "vitest";
import type { Item, ItemType } from "../api/types.js";
import {
	parentCandidates,
	parentFieldLabel,
	parentTypeFor,
} from "./hierarchy.js";

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

// épica 1 ─ tarea 2 ─ subtarea 3
//         └ tarea 4
// épica 5
const items: Item[] = [
	makeItem(1, "epic"),
	makeItem(2, "task", 1),
	makeItem(3, "subtask", 2),
	makeItem(4, "task", 1),
	makeItem(5, "epic"),
];

describe("parentTypeFor / parentFieldLabel", () => {
	it("mapea cada tipo con el padre que admite", () => {
		expect(parentTypeFor("task")).toBe("epic");
		expect(parentTypeFor("subtask")).toBe("task");
		expect(parentTypeFor("epic")).toBeNull();
	});

	it("etiqueta el campo según el tipo", () => {
		expect(parentFieldLabel("subtask")).toBe("Tarea madre");
		expect(parentFieldLabel("task")).toBe("Épica (opcional)");
	});
});

describe("parentCandidates", () => {
	it("una tarea solo puede colgar de épicas", () => {
		expect(parentCandidates(items, "task").map((item) => item.id)).toEqual([
			1, 5,
		]);
	});

	it("una subtarea solo puede colgar de tareas", () => {
		expect(parentCandidates(items, "subtask").map((item) => item.id)).toEqual([
			2, 4,
		]);
	});

	it("una épica no tiene padre posible", () => {
		expect(parentCandidates(items, "epic")).toEqual([]);
	});

	it("al editar, excluye el propio ítem", () => {
		expect(
			parentCandidates(items, "subtask", 2).map((item) => item.id),
		).toEqual([4]);
	});

	it("al editar, excluye también la descendencia", () => {
		// Red de seguridad ante datos anidados más allá de los 3 niveles:
		// ni el ítem ni su descendencia pueden ofrecerse como padre.
		const nested: Item[] = [
			makeItem(10, "task"),
			makeItem(11, "task", 10),
			makeItem(12, "task", 11),
			makeItem(13, "task"),
		];
		expect(
			parentCandidates(nested, "subtask", 10).map((item) => item.id),
		).toEqual([13]);
	});
});
