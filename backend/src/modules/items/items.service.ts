import { DomainError, NotFoundError } from "../../lib/errors.js";
import type { ProjectsRepo } from "../projects/projects.repo.js";
import type { Describer } from "./items.describer.js";
import type { ItemsRepo } from "./items.repo.js";
import type { CreateItem, Item, ItemType, UpdateItem } from "./items.schema.js";

/**
 * Reglas de jerarquía (functional.md §3.1):
 *   épica → sin padre · tarea → sin padre o bajo épica · subtarea → bajo tarea.
 */
function assertHierarchy(type: ItemType, parent: Item | null): void {
	if (type === "epic" && parent !== null) {
		throw new DomainError("una épica no puede tener padre");
	}
	if (type === "task" && parent !== null && parent.type !== "epic") {
		throw new DomainError("una tarea solo puede colgar de una épica");
	}
	if (type === "subtask" && parent?.type !== "task") {
		throw new DomainError("una subtarea debe colgar de una tarea");
	}
}

export class ItemsService {
	constructor(
		private readonly repo: ItemsRepo,
		private readonly projectsRepo: ProjectsRepo,
		private readonly now: () => Date = () => new Date(),
		/** Gancho para la Fase 2: cronometraje automático en cambios de estado. */
		private readonly onStatusChange?: (
			item: Item,
			previous: Item["status"],
		) => Promise<void>,
		/** IA local para "mejorar formato" (Fase 8); opcional: sin ella el
		 * endpoint responde 422 y la UI conserva el texto original. */
		private readonly describer?: Describer,
	) {}

	/** Reformatea + enriquece una descripción con la IA local (markdown). */
	async improveDescription(text: string): Promise<string> {
		if (!this.describer) {
			throw new DomainError("la IA de descripciones no está configurada");
		}
		try {
			return await this.describer.improve(text);
		} catch (error) {
			const cause = error instanceof Error ? error.message : "error";
			throw new DomainError(`la IA no pudo mejorar la descripción (${cause})`);
		}
	}

	async listByProject(projectId: number): Promise<Item[]> {
		const project = await this.projectsRepo.getById(projectId);
		if (!project) {
			throw new NotFoundError(`proyecto ${projectId} no existe`);
		}
		return this.repo.listByProject(projectId);
	}

	async get(id: number): Promise<Item> {
		const item = await this.repo.getById(id);
		if (!item) {
			throw new NotFoundError(`ítem ${id} no existe`);
		}
		return item;
	}

	async create(data: CreateItem): Promise<Item> {
		const project = await this.projectsRepo.getById(data.project_id);
		if (!project) {
			throw new NotFoundError(`proyecto ${data.project_id} no existe`);
		}
		const parent = await this.resolveParent(
			data.parent_id ?? null,
			data.project_id,
		);
		assertHierarchy(data.type, parent);
		return this.repo.insert({
			project_id: data.project_id,
			parent_id: parent?.id ?? null,
			type: data.type,
			title: data.title,
			description: data.description ?? null,
			start_date: data.start_date ?? null,
			end_date: data.end_date ?? null,
			estimate_min: data.estimate_min ?? null,
			created_at: this.now().toISOString(),
		});
	}

	async update(id: number, patch: UpdateItem): Promise<Item> {
		const current = await this.get(id);

		if (patch.parent_id !== undefined) {
			const parent = await this.resolveParent(
				patch.parent_id,
				current.project_id,
			);
			await this.assertNoCycle(current.id, parent);
			assertHierarchy(current.type, parent);
		}

		const start =
			patch.start_date !== undefined ? patch.start_date : current.start_date;
		const end =
			patch.end_date !== undefined ? patch.end_date : current.end_date;
		if (start && end && start > end) {
			throw new DomainError("end_date no puede ser anterior a start_date");
		}

		// exactOptionalPropertyTypes: solo entran las claves realmente presentes.
		const fields: Parameters<ItemsRepo["update"]>[1] = {};
		if (patch.title !== undefined) fields.title = patch.title;
		if (patch.description !== undefined) fields.description = patch.description;
		if (patch.status !== undefined) fields.status = patch.status;
		if (patch.parent_id !== undefined) fields.parent_id = patch.parent_id;
		if (patch.start_date !== undefined) fields.start_date = patch.start_date;
		if (patch.end_date !== undefined) fields.end_date = patch.end_date;
		if (patch.estimate_min !== undefined)
			fields.estimate_min = patch.estimate_min;

		const updated = await this.repo.update(
			id,
			fields,
			this.now().toISOString(),
		);
		if (!updated) {
			throw new NotFoundError(`ítem ${id} no existe`);
		}
		if (patch.status !== undefined && patch.status !== current.status) {
			await this.onStatusChange?.(updated, current.status);
		}
		return updated;
	}

	async remove(id: number): Promise<void> {
		const removed = await this.repo.remove(id);
		if (!removed) {
			throw new NotFoundError(`ítem ${id} no existe`);
		}
	}

	private async resolveParent(
		parentId: number | null,
		projectId: number,
	): Promise<Item | null> {
		if (parentId === null) {
			return null;
		}
		const parent = await this.repo.getById(parentId);
		if (!parent) {
			throw new NotFoundError(`ítem padre ${parentId} no existe`);
		}
		if (parent.project_id !== projectId) {
			throw new DomainError("el padre debe pertenecer al mismo proyecto");
		}
		return parent;
	}

	/** Evita re-anidar un ítem bajo su propio descendiente. */
	private async assertNoCycle(
		itemId: number,
		parent: Item | null,
	): Promise<void> {
		let cursor = parent;
		while (cursor) {
			if (cursor.id === itemId) {
				throw new DomainError("no se puede anidar un ítem bajo sí mismo");
			}
			cursor = cursor.parent_id
				? await this.repo.getById(cursor.parent_id)
				: null;
		}
	}
}
