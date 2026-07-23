import { describe, expect, it, vi } from "vitest";
import type { Item } from "../items/items.schema.js";
import type { TimelogRepo } from "./timelog.repo.js";
import type { TimeLog } from "./timelog.schema.js";
import { TimelogService } from "./timelog.service.js";

function makeItem(status: Item["status"]): Item {
	return {
		id: 10,
		project_id: 1,
		parent_id: null,
		type: "task",
		key: "GP-1",
		title: "Tarea",
		description: null,
		status,
		start_date: null,
		end_date: null,
		estimate_min: null,
		created_at: "2026-07-23T09:00:00.000Z",
		updated_at: "2026-07-23T09:00:00.000Z",
	};
}

function makeLog(overrides: Partial<TimeLog> = {}): TimeLog {
	return {
		id: 1,
		item_id: 10,
		started_at: "2026-07-23T10:00:00.000Z",
		ended_at: null,
		duration_sec: null,
		...overrides,
	};
}

function mockRepo(overrides: Partial<TimelogRepo> = {}): TimelogRepo {
	return {
		listByItem: vi.fn().mockResolvedValue([]),
		findOpen: vi.fn().mockResolvedValue(null),
		open: vi.fn().mockResolvedValue(makeLog()),
		close: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as TimelogRepo;
}

describe("TimelogService.onStatusChange", () => {
	it("abre un tramo al entrar en in_progress", async () => {
		const open = vi.fn().mockResolvedValue(makeLog());
		const service = new TimelogService(
			mockRepo({ open }),
			() => new Date("2026-07-23T10:00:00.000Z"),
		);

		await service.onStatusChange(makeItem("in_progress"), "backlog");

		expect(open).toHaveBeenCalledWith(10, "2026-07-23T10:00:00.000Z");
	});

	it("no abre un segundo tramo si ya hay uno abierto", async () => {
		const open = vi.fn();
		const service = new TimelogService(
			mockRepo({ open, findOpen: vi.fn().mockResolvedValue(makeLog()) }),
			() => new Date("2026-07-23T10:00:00.000Z"),
		);

		await service.onStatusChange(makeItem("in_progress"), "blocked");

		expect(open).not.toHaveBeenCalled();
	});

	it("cierra el tramo al pasar a done con la duración correcta", async () => {
		const close = vi.fn();
		const service = new TimelogService(
			mockRepo({ findOpen: vi.fn().mockResolvedValue(makeLog()), close }),
			() => new Date("2026-07-23T11:30:00.000Z"), // 90 min después
		);

		await service.onStatusChange(makeItem("done"), "in_progress");

		expect(close).toHaveBeenCalledWith(1, "2026-07-23T11:30:00.000Z", 5400);
	});

	it("también cierra el tramo al pasar a blocked (el bloqueo no es trabajo)", async () => {
		const close = vi.fn();
		const service = new TimelogService(
			mockRepo({ findOpen: vi.fn().mockResolvedValue(makeLog()), close }),
			() => new Date("2026-07-23T10:10:00.000Z"),
		);

		await service.onStatusChange(makeItem("blocked"), "in_progress");

		expect(close).toHaveBeenCalledWith(1, "2026-07-23T10:10:00.000Z", 600);
	});

	it("backlog → blocked no toca ningún tramo", async () => {
		const open = vi.fn();
		const close = vi.fn();
		const service = new TimelogService(mockRepo({ open, close }));

		await service.onStatusChange(makeItem("blocked"), "backlog");

		expect(open).not.toHaveBeenCalled();
		expect(close).not.toHaveBeenCalled();
	});
});

describe("TimelogService.summary", () => {
	it("suma tramos cerrados y añade el tramo abierto hasta ahora", async () => {
		const logs = [
			makeLog({ id: 1, ended_at: "x", duration_sec: 3600 }),
			makeLog({ id: 2, ended_at: "x", duration_sec: 1800 }),
			makeLog({ id: 3, started_at: "2026-07-23T12:00:00.000Z" }), // abierto
		];
		const service = new TimelogService(
			mockRepo({ listByItem: vi.fn().mockResolvedValue(logs) }),
			() => new Date("2026-07-23T12:05:00.000Z"),
		);

		const summary = await service.summary(10);

		expect(summary.total_sec).toBe(3600 + 1800 + 300);
		expect(summary.running).toBe(true);
	});

	it("sin tramos: total cero y running false", async () => {
		const service = new TimelogService(mockRepo());

		const summary = await service.summary(10);

		expect(summary).toMatchObject({ total_sec: 0, running: false, logs: [] });
	});
});
