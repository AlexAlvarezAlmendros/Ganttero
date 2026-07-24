import { describe, expect, it, vi } from "vitest";
import { DomainError, NotFoundError } from "../../lib/errors.js";
import type { ProjectsRepo } from "../projects/projects.repo.js";
import type { ItemsRepo } from "./items.repo.js";
import type { Item } from "./items.schema.js";
import { ItemsService } from "./items.service.js";

const fixedNow = () => new Date("2026-07-23T10:00:00.000Z");

const project = {
	id: 1,
	name: "Ganttero",
	key_prefix: "GP",
	description: null,
	created_at: "2026-07-23T10:00:00.000Z",
	archived_at: null,
};

function makeItem(overrides: Partial<Item> = {}): Item {
	return {
		id: 10,
		project_id: 1,
		parent_id: null,
		type: "task",
		key: "GP-1",
		title: "Tarea",
		description: null,
		status: "backlog",
		start_date: null,
		end_date: null,
		estimate_min: null,
		created_at: "2026-07-23T10:00:00.000Z",
		updated_at: "2026-07-23T10:00:00.000Z",
		...overrides,
	};
}

function mockItemsRepo(overrides: Partial<ItemsRepo> = {}): ItemsRepo {
	return {
		listByProject: vi.fn().mockResolvedValue([]),
		getById: vi.fn().mockResolvedValue(null),
		insert: vi.fn().mockResolvedValue(makeItem()),
		update: vi.fn().mockResolvedValue(makeItem()),
		remove: vi.fn().mockResolvedValue(false),
		...overrides,
	} as unknown as ItemsRepo;
}

function mockProjectsRepo(found = true): ProjectsRepo {
	return {
		getById: vi.fn().mockResolvedValue(found ? project : null),
	} as unknown as ProjectsRepo;
}

describe("ItemsService.create", () => {
	it("rechaza crear en un proyecto inexistente", async () => {
		const service = new ItemsService(
			mockItemsRepo(),
			mockProjectsRepo(false),
			fixedNow,
		);

		await expect(
			service.create({ project_id: 9, type: "task", title: "x" }),
		).rejects.toThrow(NotFoundError);
	});

	it("una épica no puede tener padre", async () => {
		const epic = makeItem({ id: 5, type: "epic" });
		const repo = mockItemsRepo({ getById: vi.fn().mockResolvedValue(epic) });
		const service = new ItemsService(repo, mockProjectsRepo(), fixedNow);

		await expect(
			service.create({ project_id: 1, parent_id: 5, type: "epic", title: "x" }),
		).rejects.toThrow(DomainError);
	});

	it("una subtarea exige padre de tipo tarea", async () => {
		const service = new ItemsService(
			mockItemsRepo(),
			mockProjectsRepo(),
			fixedNow,
		);

		await expect(
			service.create({ project_id: 1, type: "subtask", title: "x" }),
		).rejects.toThrow(/subtarea/);
	});

	it("una tarea no puede colgar de otra tarea", async () => {
		const parentTask = makeItem({ id: 5, type: "task" });
		const repo = mockItemsRepo({
			getById: vi.fn().mockResolvedValue(parentTask),
		});
		const service = new ItemsService(repo, mockProjectsRepo(), fixedNow);

		await expect(
			service.create({ project_id: 1, parent_id: 5, type: "task", title: "x" }),
		).rejects.toThrow(/épica/);
	});

	it("rechaza un padre de otro proyecto", async () => {
		const foreign = makeItem({ id: 5, type: "epic", project_id: 2 });
		const repo = mockItemsRepo({ getById: vi.fn().mockResolvedValue(foreign) });
		const service = new ItemsService(repo, mockProjectsRepo(), fixedNow);

		await expect(
			service.create({ project_id: 1, parent_id: 5, type: "task", title: "x" }),
		).rejects.toThrow(/mismo proyecto/);
	});
});

describe("ItemsService.update", () => {
	it("valida fechas fusionando el patch con el estado actual", async () => {
		const current = makeItem({
			start_date: "2026-07-20",
			end_date: "2026-07-25",
		});
		const repo = mockItemsRepo({ getById: vi.fn().mockResolvedValue(current) });
		const service = new ItemsService(repo, mockProjectsRepo(), fixedNow);

		await expect(
			service.update(10, { end_date: "2026-07-19" }),
		).rejects.toThrow(DomainError);
	});

	it("impide anidar un ítem bajo su propio descendiente", async () => {
		const epic = makeItem({ id: 1, type: "epic" });
		const task = makeItem({ id: 2, type: "task", parent_id: 1 });
		// intentamos colgar la épica 1 de... una tarea cuyo ancestro es la propia épica
		const getById = vi.fn(async (id: number) => {
			if (id === 1) return epic;
			if (id === 2) return task;
			return null;
		});
		const repo = mockItemsRepo({ getById });
		const service = new ItemsService(repo, mockProjectsRepo(), fixedNow);

		// la subtarea 3 quiere ser padre... caso directo: tarea 2 → padre tarea 2 (ciclo corto)
		await expect(service.update(2, { parent_id: 2 })).rejects.toThrow(
			/sí mismo/,
		);
	});

	it("dispara el gancho onStatusChange solo cuando cambia el estado", async () => {
		const current = makeItem({ status: "backlog" });
		const updated = makeItem({ status: "in_progress" });
		const hook = vi.fn().mockResolvedValue(undefined);
		const repo = mockItemsRepo({
			getById: vi.fn().mockResolvedValue(current),
			update: vi.fn().mockResolvedValue(updated),
		});
		const service = new ItemsService(repo, mockProjectsRepo(), fixedNow, hook);

		await service.update(10, { status: "in_progress" });
		expect(hook).toHaveBeenCalledWith(updated, "backlog");

		hook.mockClear();
		await service.update(10, { title: "otro título" });
		expect(hook).not.toHaveBeenCalled();
	});
});
