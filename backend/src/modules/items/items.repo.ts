import type { Client, Row } from "@libsql/client";
import type { Item } from "./items.schema.js";
import type { ItemStatus, ItemType } from "./items.schema.js";

/** Todas las consultas llevan el JOIN con project para componer la clave GP-42. */
const SELECT = `SELECT item.*, project.key_prefix AS key_prefix
	FROM item JOIN project ON project.id = item.project_id`;

function rowToItem(row: Row): Item {
	return {
		id: Number(row["id"]),
		project_id: Number(row["project_id"]),
		parent_id: row["parent_id"] === null ? null : Number(row["parent_id"]),
		type: String(row["type"]) as ItemType,
		key: `${String(row["key_prefix"])}-${Number(row["key_number"])}`,
		title: String(row["title"]),
		description:
			row["description"] === null ? null : String(row["description"]),
		status: String(row["status"]) as ItemStatus,
		start_date: row["start_date"] === null ? null : String(row["start_date"]),
		end_date: row["end_date"] === null ? null : String(row["end_date"]),
		estimate_min:
			row["estimate_min"] === null ? null : Number(row["estimate_min"]),
		created_at: String(row["created_at"]),
		updated_at: String(row["updated_at"]),
	};
}

export class ItemsRepo {
	constructor(private readonly db: Client) {}

	/** Todos los proyectos a la vez (vista "TODOS LOS PROYECTOS"). */
	async listAll(): Promise<Item[]> {
		const result = await this.db.execute(
			`${SELECT} ORDER BY item.start_date IS NULL, item.start_date, item.id`,
		);
		return result.rows.map(rowToItem);
	}

	async listByProject(projectId: number): Promise<Item[]> {
		const result = await this.db.execute({
			sql: `${SELECT} WHERE item.project_id = ? ORDER BY item.start_date IS NULL, item.start_date, item.id`,
			args: [projectId],
		});
		return result.rows.map(rowToItem);
	}

	async getById(id: number): Promise<Item | null> {
		const result = await this.db.execute({
			sql: `${SELECT} WHERE item.id = ?`,
			args: [id],
		});
		const row = result.rows[0];
		return row ? rowToItem(row) : null;
	}

	async insert(data: {
		project_id: number;
		parent_id: number | null;
		type: ItemType;
		title: string;
		description: string | null;
		start_date: string | null;
		end_date: string | null;
		estimate_min: number | null;
		created_at: string;
	}): Promise<Item> {
		// key_number secuencial por proyecto, asignado en el propio INSERT.
		const result = await this.db.execute({
			sql: `INSERT INTO item (project_id, parent_id, type, key_number, title, description, status, start_date, end_date, estimate_min, created_at, updated_at)
				VALUES (?, ?, ?, (SELECT COALESCE(MAX(key_number), 0) + 1 FROM item WHERE project_id = ?), ?, ?, 'backlog', ?, ?, ?, ?, ?)
				RETURNING id`,
			args: [
				data.project_id,
				data.parent_id,
				data.type,
				data.project_id,
				data.title,
				data.description,
				data.start_date,
				data.end_date,
				data.estimate_min,
				data.created_at,
				data.created_at,
			],
		});
		const row = result.rows[0];
		if (!row) {
			throw new Error("INSERT sin fila devuelta");
		}
		const item = await this.getById(Number(row["id"]));
		if (!item) {
			throw new Error("ítem recién insertado no encontrado");
		}
		return item;
	}

	async update(
		id: number,
		fields: Partial<{
			title: string;
			description: string | null;
			status: ItemStatus;
			parent_id: number | null;
			start_date: string | null;
			end_date: string | null;
			estimate_min: number | null;
		}>,
		updatedAt: string,
	): Promise<Item | null> {
		const keys = Object.keys(fields) as Array<keyof typeof fields>;
		const sets = [...keys.map((key) => `${key} = ?`), "updated_at = ?"].join(
			", ",
		);
		const args = [...keys.map((key) => fields[key] ?? null), updatedAt];
		const result = await this.db.execute({
			sql: `UPDATE item SET ${sets} WHERE id = ? RETURNING id`,
			args: [...args, id],
		});
		const row = result.rows[0];
		return row ? this.getById(Number(row["id"])) : null;
	}

	async remove(id: number): Promise<boolean> {
		const result = await this.db.execute({
			sql: "DELETE FROM item WHERE id = ?",
			args: [id],
		});
		return result.rowsAffected > 0;
	}
}
