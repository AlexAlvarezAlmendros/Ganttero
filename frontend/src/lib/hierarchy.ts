import type { Item, ItemType } from "../api/types.js";

/**
 * Jerarquía épica → tarea → subtarea (functional.md §3.1). Lógica pura y
 * compartida por el alta (ItemDialog) y la edición (TaskDetail) para que
 * ambas ofrezcan exactamente los mismos padres válidos.
 */

/** Tipo de padre admisible para cada tipo de ítem; `null` = no lleva padre. */
export function parentTypeFor(type: ItemType): ItemType | null {
	if (type === "task") return "epic";
	if (type === "subtask") return "task";
	return null;
}

/** ids del ítem y de toda su descendencia: nunca puede colgar de ellos. */
function descendantsOf(items: Item[], selfId: number): Set<number> {
	const blocked = new Set([selfId]);
	// La jerarquía tiene 3 niveles, pero se recorre hasta punto fijo por si
	// llegan datos desordenados: cada pasada añade los hijos ya conocidos.
	let grew = true;
	while (grew) {
		grew = false;
		for (const item of items) {
			if (
				item.parent_id !== null &&
				blocked.has(item.parent_id) &&
				!blocked.has(item.id)
			) {
				blocked.add(item.id);
				grew = true;
			}
		}
	}
	return blocked;
}

/**
 * Padres válidos para un ítem del tipo dado dentro de un proyecto.
 * `selfId` (al editar) excluye el propio ítem y su descendencia.
 */
export function parentCandidates(
	items: Item[],
	type: ItemType,
	selfId?: number,
): Item[] {
	const parentType = parentTypeFor(type);
	if (parentType === null) return [];
	const blocked =
		selfId === undefined ? new Set<number>() : descendantsOf(items, selfId);
	return items.filter(
		(item) => item.type === parentType && !blocked.has(item.id),
	);
}

/** Etiqueta del selector de padre según el tipo de ítem. */
export function parentFieldLabel(type: ItemType): string {
	return type === "subtask" ? "Tarea madre" : "Épica (opcional)";
}
