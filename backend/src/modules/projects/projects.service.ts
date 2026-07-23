import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { ProjectsRepo } from "./projects.repo.js";
import type {
	CreateProject,
	Project,
	UpdateProject,
} from "./projects.schema.js";

export class ProjectsService {
	constructor(
		private readonly repo: ProjectsRepo,
		private readonly now: () => Date = () => new Date(),
	) {}

	list(): Promise<Project[]> {
		return this.repo.list();
	}

	async get(id: number): Promise<Project> {
		const project = await this.repo.getById(id);
		if (!project) {
			throw new NotFoundError(`proyecto ${id} no existe`);
		}
		return project;
	}

	async create(data: CreateProject): Promise<Project> {
		const existing = await this.repo.getByKeyPrefix(data.key_prefix);
		if (existing) {
			throw new ConflictError(`el prefijo ${data.key_prefix} ya está en uso`);
		}
		return this.repo.insert({
			name: data.name,
			key_prefix: data.key_prefix,
			description: data.description ?? null,
			created_at: this.now().toISOString(),
		});
	}

	async update(id: number, patch: UpdateProject): Promise<Project> {
		await this.get(id);
		const fields: Parameters<ProjectsRepo["update"]>[1] = {};
		if (patch.name !== undefined) {
			fields.name = patch.name;
		}
		if (patch.description !== undefined) {
			fields.description = patch.description;
		}
		if (patch.archived !== undefined) {
			fields.archived_at = patch.archived ? this.now().toISOString() : null;
		}
		const updated = await this.repo.update(id, fields);
		if (!updated) {
			throw new NotFoundError(`proyecto ${id} no existe`);
		}
		return updated;
	}

	async remove(id: number): Promise<void> {
		const removed = await this.repo.remove(id);
		if (!removed) {
			throw new NotFoundError(`proyecto ${id} no existe`);
		}
	}
}
