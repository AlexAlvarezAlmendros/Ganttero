import { describe, expect, it } from "vitest";
import type { Item, ItemStatus, ItemType } from "../api/types.js";
import {
	NO_FILTERS,
	epicIdOf,
	epicsOf,
	filterBacklog,
	hasActiveFilters,
} from "./backlog.js";

const TODAY = "2026-08-09";
const WINDOW = 14;

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

// épica 1 ─ tarea 2 (dentro de ventana) ─ subtarea 3 (sin fecha)
//         └ tarea 4 (vencida, no hecha)
// épica 5 ─ tarea 6 (lejos, fuera de ventana)
// tarea 7 sin épica y sin fecha · tarea 8 vencida pero HECHA
const items: Item[] = [
	makeItem(1, "epic"),
	makeItem(2, "task", {
		parent_id: 1,
		start_date: "2026-08-10",
		end_date: "2026-08-12",
	}),
	makeItem(3, "subtask", { parent_id: 2 }),
	makeItem(4, "task", {
		parent_id: 1,
		start_date: "2026-07-01",
		end_date: "2026-07-05",
	}),
	makeItem(5, "epic"),
	makeItem(6, "task", {
		parent_id: 5,
		start_date: "2026-12-01",
		end_date: "2026-12-10",
	}),
	makeItem(7, "task"),
	makeItem(8, "task", {
		status: "done" as ItemStatus,
		start_date: "2026-07-02",
		end_date: "2026-07-03",
	}),
];

function ids(result: Item[]): number[] {
	return result.map((item) => item.id);
}

function run(filters: Partial<typeof NO_FILTERS>): number[] {
	return ids(
		filterBacklog(items, { ...NO_FILTERS, ...filters }, TODAY, WINDOW),
	);
}

describe("filterBacklog — sin filtros", () => {
	it("incluye TODAS las tareas: planificadas, sin planificar, dentro y fuera de ventana", () => {
		// El backlog no esconde nada; solo las épicas quedan fuera (contienen).
		expect(run({})).toEqual([4, 8, 2, 6, 3, 7]);
	});

	it("ordena por fecha de inicio efectiva y deja lo no planificado al final", () => {
		const result = run({});
		expect(result.slice(0, 4)).toEqual([4, 8, 2, 6]);
		expect(result.slice(4).sort()).toEqual([3, 7]);
	});
});

describe("filterBacklog — filtro por estado", () => {
	it("deja solo el estado pedido", () => {
		expect(run({ status: "done" })).toEqual([8]);
	});
});

describe("filterBacklog — filtro por fecha", () => {
	it("sin planificar: solo lo que no tiene ninguna fecha", () => {
		expect(run({ date: "unplanned" }).sort()).toEqual([3, 7]);
	});

	it("planificadas: solo lo que tiene alguna fecha", () => {
		expect(run({ date: "planned" })).toEqual([4, 8, 2, 6]);
	});

	it("en la ventana: cruza [hoy, hoy+14]", () => {
		expect(run({ date: "window" })).toEqual([2]);
	});

	it("vencidas: fin anterior a hoy y no hechas", () => {
		// La 8 también venció, pero está hecha: ya no es deuda.
		expect(run({ date: "overdue" })).toEqual([4]);
	});

	it("rango libre: se queda lo que se solapa con [desde, hasta]", () => {
		expect(run({ from: "2026-08-01", to: "2026-08-31" })).toEqual([2]);
	});

	it("un rango libre excluye lo que no tiene fechas", () => {
		expect(run({ from: "2026-01-01" })).toEqual([4, 8, 2, 6]);
	});
});

describe("filterBacklog — filtro por épica", () => {
	it("una tarea cuelga de su épica", () => {
		expect(run({ epic: 5 })).toEqual([6]);
	});

	it("una subtarea hereda la épica de su tarea madre", () => {
		expect(run({ epic: 1 })).toEqual([4, 2, 3]);
	});

	it("«sin épica» recoge lo que cuelga de la raíz", () => {
		expect(run({ epic: "none" })).toEqual([8, 7]);
	});
});

describe("filterBacklog — filtros combinados", () => {
	it("estado + épica + fecha se acumulan", () => {
		expect(run({ epic: 1, date: "unplanned", status: "backlog" })).toEqual([3]);
	});

	it("una combinación sin resultados devuelve lista vacía", () => {
		expect(run({ epic: 5, date: "overdue" })).toEqual([]);
	});
});

describe("filterBacklog — vista de todos los proyectos", () => {
	// Mismo conjunto, más una tarea de otro proyecto.
	const mixed: Item[] = [
		...items,
		makeItem(30, "task", { project_id: 2, key: "OT-1", title: "del otro" }),
	];

	it("sin filtro de proyecto entra el trabajo de todos", () => {
		const result = filterBacklog(mixed, NO_FILTERS, TODAY, WINDOW);
		expect(result.map((item) => item.id)).toContain(30);
		expect(result).toHaveLength(7);
	});

	it("el filtro de proyecto deja solo el suyo", () => {
		const result = filterBacklog(
			mixed,
			{ ...NO_FILTERS, project: 2 },
			TODAY,
			WINDOW,
		);
		expect(result.map((item) => item.id)).toEqual([30]);
	});

	it("se combina con los demás filtros", () => {
		const result = filterBacklog(
			mixed,
			{ ...NO_FILTERS, project: 1, date: "overdue" },
			TODAY,
			WINDOW,
		);
		expect(result.map((item) => item.id)).toEqual([4]);
	});
});

describe("epicIdOf / epicsOf / hasActiveFilters", () => {
	const byId = new Map(items.map((item) => [item.id, item]));

	it("resuelve la épica de tareas y subtareas", () => {
		expect(epicIdOf(items[1] as Item, byId)).toBe(1);
		expect(epicIdOf(items[2] as Item, byId)).toBe(1);
		expect(epicIdOf(items[6] as Item, byId)).toBeNull();
	});

	it("no se cuelga si los datos traen un ciclo", () => {
		const a = makeItem(20, "task", { parent_id: 21 });
		const b = makeItem(21, "task", { parent_id: 20 });
		const cyclic = new Map([
			[20, a],
			[21, b],
		]);
		expect(epicIdOf(a, cyclic)).toBeNull();
	});

	it("lista las épicas del proyecto", () => {
		expect(epicsOf(items).map((epic) => epic.id)).toEqual([1, 5]);
	});

	it("detecta si hay algún filtro puesto", () => {
		expect(hasActiveFilters(NO_FILTERS)).toBe(false);
		expect(hasActiveFilters({ ...NO_FILTERS, project: 2 })).toBe(true);
		expect(hasActiveFilters({ ...NO_FILTERS, status: "done" })).toBe(true);
		expect(hasActiveFilters({ ...NO_FILTERS, from: "2026-08-01" })).toBe(true);
	});
});
