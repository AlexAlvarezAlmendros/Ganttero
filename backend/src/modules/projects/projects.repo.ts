import type { Client, Row } from "@libsql/client";
import type { Project } from "./projects.schema.js";

function rowToProject(row: Row): Project {
	return {
		id: Number(row["id"]),
		name: String(row["name"]),
		key_prefix: String(row["key_prefix"]),
		description:
			row["description"] === null ? null : String(row["description"]),
		created_at: String(row["created_at"]),
		archived_at:
			row["archived_at"] === null ? null : String(row["archived_at"]),
	};
}

export class ProjectsRepo {
	constructor(private readonly db: Client) {}

	async list(): Promise<Project[]> {
		const result = await this.db.execute(
			"SELECT * FROM project ORDER BY created_at, id",
		);
		return result.rows.map(rowToProject);
	}

	async getById(id: number): Promise<Project | null> {
		const result = await this.db.execute({
			sql: "SELECT * FROM project WHERE id = ?",
			args: [id],
		});
		const row = result.rows[0];
		return row ? rowToProject(row) : null;
	}

	async getByKeyPrefix(keyPrefix: string): Promise<Project | null> {
		const result = await this.db.execute({
			sql: "SELECT * FROM project WHERE key_prefix = ?",
			args: [keyPrefix],
		});
		const row = result.rows[0];
		return row ? rowToProject(row) : null;
	}

	async insert(data: {
		name: string;
		key_prefix: string;
		description: string | null;
		created_at: string;
	}): Promise<Project> {
		const result = await this.db.execute({
			sql: `INSERT INTO project (name, key_prefix, description, created_at)
				VALUES (?, ?, ?, ?) RETURNING *`,
			args: [data.name, data.key_prefix, data.description, data.created_at],
		});
		const row = result.rows[0];
		if (!row) {
			throw new Error("INSERT sin fila devuelta");
		}
		return rowToProject(row);
	}

	async update(
		id: number,
		fields: Partial<{
			name: string;
			description: string | null;
			archived_at: string | null;
		}>,
	): Promise<Project | null> {
		const keys = Object.keys(fields) as Array<keyof typeof fields>;
		if (keys.length === 0) {
			return this.getById(id);
		}
		const sets = keys.map((key) => `${key} = ?`).join(", ");
		const args = keys.map((key) => fields[key] ?? null);
		const result = await this.db.execute({
			sql: `UPDATE project SET ${sets} WHERE id = ? RETURNING *`,
			args: [...args, id],
		});
		const row = result.rows[0];
		return row ? rowToProject(row) : null;
	}

	async remove(id: number): Promise<boolean> {
		const result = await this.db.execute({
			sql: "DELETE FROM project WHERE id = ?",
			args: [id],
		});
		return result.rowsAffected > 0;
	}
}
