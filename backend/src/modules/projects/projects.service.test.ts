import { describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { ProjectsRepo } from "./projects.repo.js";
import { ProjectsService } from "./projects.service.js";

const fixedNow = () => new Date("2026-07-23T10:00:00.000Z");

function mockRepo(overrides: Partial<ProjectsRepo> = {}): ProjectsRepo {
	return {
		list: vi.fn().mockResolvedValue([]),
		getById: vi.fn().mockResolvedValue(null),
		getByKeyPrefix: vi.fn().mockResolvedValue(null),
		insert: vi.fn(),
		update: vi.fn(),
		remove: vi.fn().mockResolvedValue(false),
		...overrides,
	} as unknown as ProjectsRepo;
}

const sample = {
	id: 1,
	name: "Ganttero",
	key_prefix: "GP",
	description: null,
	created_at: "2026-07-23T10:00:00.000Z",
	archived_at: null,
};

describe("ProjectsService", () => {
	it("crea un proyecto con created_at del reloj inyectado", async () => {
		const insert = vi.fn().mockResolvedValue(sample);
		const service = new ProjectsService(mockRepo({ insert }), fixedNow);

		await service.create({ name: "Ganttero", key_prefix: "GP" });

		expect(insert).toHaveBeenCalledWith({
			name: "Ganttero",
			key_prefix: "GP",
			description: null,
			created_at: "2026-07-23T10:00:00.000Z",
		});
	});

	it("rechaza un key_prefix ya usado con ConflictError", async () => {
		const service = new ProjectsService(
			mockRepo({ getByKeyPrefix: vi.fn().mockResolvedValue(sample) }),
			fixedNow,
		);

		await expect(
			service.create({ name: "Otro", key_prefix: "GP" }),
		).rejects.toThrow(ConflictError);
	});

	it("get lanza NotFoundError si el proyecto no existe", async () => {
		const service = new ProjectsService(mockRepo(), fixedNow);

		await expect(service.get(99)).rejects.toThrow(NotFoundError);
	});

	it("archivar traduce archived=true a archived_at con el reloj inyectado", async () => {
		const update = vi.fn().mockResolvedValue({ ...sample, archived_at: "x" });
		const service = new ProjectsService(
			mockRepo({ getById: vi.fn().mockResolvedValue(sample), update }),
			fixedNow,
		);

		await service.update(1, { archived: true });

		expect(update).toHaveBeenCalledWith(1, {
			archived_at: "2026-07-23T10:00:00.000Z",
		});
	});

	it("desarchivar pone archived_at a null", async () => {
		const update = vi.fn().mockResolvedValue(sample);
		const service = new ProjectsService(
			mockRepo({ getById: vi.fn().mockResolvedValue(sample), update }),
			fixedNow,
		);

		await service.update(1, { archived: false });

		expect(update).toHaveBeenCalledWith(1, { archived_at: null });
	});

	it("remove lanza NotFoundError si no borra nada", async () => {
		const service = new ProjectsService(mockRepo(), fixedNow);

		await expect(service.remove(7)).rejects.toThrow(NotFoundError);
	});
});
