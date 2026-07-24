import { describe, expect, it } from "vitest";
import type { Item } from "../items/items.schema.js";
import {
	deriveBoard,
	derivePriority,
	isInWindow,
	isOverdue,
	localDayIso,
} from "./kanban.service.js";

const TODAY = "2026-07-23";
const WINDOW = 14; // ventana: [2026-07-23, 2026-08-06]

let nextId = 1;
function makeItem(overrides: Partial<Item>): Item {
	return {
		id: nextId++,
		project_id: 1,
		parent_id: null,
		type: "task",
		key: `GP-${nextId}`,
		title: "tarea",
		description: null,
		status: "backlog",
		start_date: null,
		end_date: null,
		estimate_min: null,
		created_at: "",
		updated_at: "",
		...overrides,
	};
}

describe("isInWindow — bordes exactos", () => {
	it("incluye el ítem que termina exactamente hoy", () => {
		const item = makeItem({ start_date: "2026-07-01", end_date: TODAY });
		expect(isInWindow(item, TODAY, WINDOW)).toBe(true);
	});

	it("excluye el que terminó ayer (eso es terreno de isOverdue)", () => {
		const item = makeItem({ start_date: "2026-07-01", end_date: "2026-07-22" });
		expect(isInWindow(item, TODAY, WINDOW)).toBe(false);
	});

	it("incluye el que empieza exactamente en hoy+ventana", () => {
		const item = makeItem({ start_date: "2026-08-06", end_date: "2026-08-20" });
		expect(isInWindow(item, TODAY, WINDOW)).toBe(true);
	});

	it("excluye el que empieza en hoy+ventana+1", () => {
		const item = makeItem({ start_date: "2026-08-07", end_date: "2026-08-20" });
		expect(isInWindow(item, TODAY, WINDOW)).toBe(false);
	});

	it("un ítem que envuelve toda la ventana está dentro", () => {
		const item = makeItem({ start_date: "2026-06-01", end_date: "2026-12-01" });
		expect(isInWindow(item, TODAY, WINDOW)).toBe(true);
	});

	it("sin fecha de fin, el inicio hace de rango completo", () => {
		expect(
			isInWindow(makeItem({ start_date: "2026-07-30" }), TODAY, WINDOW),
		).toBe(true);
		expect(
			isInWindow(makeItem({ start_date: "2026-09-01" }), TODAY, WINDOW),
		).toBe(false);
	});

	it("sin ninguna fecha no entra por ventana", () => {
		expect(isInWindow(makeItem({}), TODAY, WINDOW)).toBe(false);
	});

	it("la ventana respeta el tamaño configurado", () => {
		const item = makeItem({ start_date: "2026-07-31", end_date: "2026-08-02" });
		expect(isInWindow(item, TODAY, 8)).toBe(true); // hoy+8 = 07-31 = start
		expect(isInWindow(item, TODAY, 7)).toBe(false); // hoy+7 = 07-30 < start
	});
});

describe("isOverdue", () => {
	it("vencida y sin hacer → retrasada (nunca desaparece del tablero)", () => {
		const item = makeItem({ start_date: "2026-07-01", end_date: "2026-07-22" });
		expect(isOverdue(item, TODAY)).toBe(true);
	});

	it("hecha nunca está retrasada", () => {
		const item = makeItem({
			status: "done",
			start_date: "2026-07-01",
			end_date: "2026-07-22",
		});
		expect(isOverdue(item, TODAY)).toBe(false);
	});

	it("terminar hoy no es estar retrasada", () => {
		expect(isOverdue(makeItem({ end_date: TODAY }), TODAY)).toBe(false);
	});
});

describe("derivePriority — tabla de architecture.md §5", () => {
	it("done y blocked mandan sobre las fechas", () => {
		const late = { start_date: "2026-07-01", end_date: "2026-07-10" };
		expect(derivePriority(makeItem({ status: "done", ...late }), TODAY)).toBe(
			"done",
		);
		expect(
			derivePriority(makeItem({ status: "blocked", ...late }), TODAY),
		).toBe("blocked");
	});

	it("end < hoy → late (también estando en curso)", () => {
		const item = makeItem({
			status: "in_progress",
			start_date: "2026-07-01",
			end_date: "2026-07-22",
		});
		expect(derivePriority(item, TODAY)).toBe("late");
	});

	it("empieza hoy o mañana → now; ya empezada también es now", () => {
		expect(
			derivePriority(
				makeItem({ start_date: TODAY, end_date: "2026-07-30" }),
				TODAY,
			),
		).toBe("now");
		expect(
			derivePriority(
				makeItem({ start_date: "2026-07-24", end_date: "2026-07-30" }),
				TODAY,
			),
		).toBe("now");
		expect(
			derivePriority(
				makeItem({ start_date: "2026-07-10", end_date: "2026-07-30" }),
				TODAY,
			),
		).toBe("now");
	});

	it("empieza pasado mañana → normal (frontera exacta de 'now')", () => {
		expect(
			derivePriority(
				makeItem({ start_date: "2026-07-25", end_date: "2026-07-30" }),
				TODAY,
			),
		).toBe("normal");
	});

	it("sin fechas → normal", () => {
		expect(derivePriority(makeItem({}), TODAY)).toBe("normal");
	});
});

describe("deriveBoard — composición del tablero", () => {
	it("las épicas nunca son tarjetas", () => {
		const epic = makeItem({ type: "epic", start_date: TODAY, end_date: TODAY });
		const board = deriveBoard([epic], TODAY, WINDOW);
		expect(Object.values(board).flat()).toHaveLength(0);
	});

	it("in_progress y blocked entran aunque estén fuera de ventana", () => {
		const farInProgress = makeItem({
			status: "in_progress",
			start_date: "2026-10-01",
			end_date: "2026-10-05",
		});
		const farBlocked = makeItem({ status: "blocked" });
		const board = deriveBoard([farInProgress, farBlocked], TODAY, WINDOW);
		expect(board.in_progress).toHaveLength(1);
		expect(board.blocked).toHaveLength(1);
	});

	it("una backlog fuera de ventana y sin vencer NO entra", () => {
		const future = makeItem({
			start_date: "2026-09-01",
			end_date: "2026-09-05",
		});
		const board = deriveBoard([future], TODAY, WINDOW);
		expect(board.backlog).toHaveLength(0);
	});

	it("una backlog vencida SÍ entra, como late (divergencia deliberada del kit)", () => {
		const overdue = makeItem({
			start_date: "2026-07-01",
			end_date: "2026-07-20",
		});
		const board = deriveBoard([overdue], TODAY, WINDOW);
		expect(board.backlog).toHaveLength(1);
		expect(board.backlog[0]?.priority).toBe("late");
	});

	it("ordena cada columna por urgencia: late → now → normal, y deadline más próximo primero", () => {
		const normal = makeItem({
			start_date: "2026-07-26",
			end_date: "2026-08-01",
			title: "normal",
		});
		const nowLater = makeItem({
			start_date: TODAY,
			end_date: "2026-08-04",
			title: "now-tarde",
		});
		const nowSoon = makeItem({
			start_date: TODAY,
			end_date: "2026-07-25",
			title: "now-pronto",
		});
		const late = makeItem({
			start_date: "2026-07-01",
			end_date: "2026-07-15",
			title: "late",
		});
		const board = deriveBoard([normal, nowLater, nowSoon, late], TODAY, WINDOW);
		expect(board.backlog.map((card) => card.title)).toEqual([
			"late",
			"now-pronto",
			"now-tarde",
			"normal",
		]);
	});

	it("las done en ventana se quedan; las done antiguas desaparecen", () => {
		const doneRecent = makeItem({
			status: "done",
			start_date: "2026-07-20",
			end_date: TODAY,
		});
		const doneOld = makeItem({
			status: "done",
			start_date: "2026-06-01",
			end_date: "2026-06-10",
		});
		const board = deriveBoard([doneRecent, doneOld], TODAY, WINDOW);
		expect(board.done).toHaveLength(1);
	});

	it("cambiar una fecha en el Gantt cambia el tablero (el hito de la fase)", () => {
		const item = makeItem({ start_date: "2026-09-01", end_date: "2026-09-05" });
		expect(deriveBoard([item], TODAY, WINDOW).backlog).toHaveLength(0);

		const moved = { ...item, start_date: "2026-07-24", end_date: "2026-07-28" };
		const board = deriveBoard([moved], TODAY, WINDOW);
		expect(board.backlog).toHaveLength(1);
		expect(board.backlog[0]?.priority).toBe("now");
	});

	it("al cambiar el día, la derivación cambia sola (nada persistido)", () => {
		const item = makeItem({ start_date: "2026-07-24", end_date: "2026-07-25" });
		expect(deriveBoard([item], "2026-07-23", WINDOW).backlog[0]?.priority).toBe(
			"now",
		);
		expect(deriveBoard([item], "2026-07-26", WINDOW).backlog[0]?.priority).toBe(
			"late",
		);
	});
});

describe("localDayIso — el día del usuario, no el de UTC (regresión)", () => {
	it("a las 00:30 locales ya es hoy, aunque UTC siga en ayer", () => {
		// Construido en hora LOCAL: independiente de la zona de la máquina.
		expect(localDayIso(new Date(2026, 6, 24, 0, 30))).toBe("2026-07-24");
		expect(localDayIso(new Date(2026, 6, 23, 23, 59))).toBe("2026-07-23");
	});

	it("rellena con ceros mes y día", () => {
		expect(localDayIso(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
	});
});

describe("orden con deadline efectivo (regresión)", () => {
	it("una late solo-con-start antigua va antes que una late con end reciente", () => {
		const soloStart = makeItem({
			title: "vencida-junio",
			start_date: "2026-06-01",
			end_date: null,
		});
		const conEnd = makeItem({
			title: "vencida-ayer",
			start_date: "2026-07-01",
			end_date: "2026-07-22",
		});
		const board = deriveBoard([conEnd, soloStart], TODAY, WINDOW);
		expect(board.backlog.map((card) => card.title)).toEqual([
			"vencida-junio",
			"vencida-ayer",
		]);
	});
});
