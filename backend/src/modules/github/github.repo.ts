import type { Client, Row } from "@libsql/client";
import type { GithubLink, ItemCommit } from "./github.schema.js";

function rowToLink(row: Row): GithubLink {
	return {
		id: Number(row["id"]),
		project_id: Number(row["project_id"]),
		repo_full_name: String(row["repo_full_name"]),
		created_at: String(row["created_at"]),
	};
}

function rowToCommit(row: Row): ItemCommit {
	return {
		id: Number(row["id"]),
		item_id: Number(row["item_id"]),
		sha: String(row["sha"]),
		message: String(row["message"]),
		url: String(row["url"]),
		committed_at: String(row["committed_at"]),
	};
}

export class GithubRepo {
	constructor(private readonly db: Client) {}

	async listLinks(projectId: number): Promise<GithubLink[]> {
		const result = await this.db.execute({
			sql: "SELECT * FROM github_link WHERE project_id = ? ORDER BY id",
			args: [projectId],
		});
		return result.rows.map(rowToLink);
	}

	async listAllLinks(): Promise<GithubLink[]> {
		const result = await this.db.execute(
			"SELECT * FROM github_link ORDER BY id",
		);
		return result.rows.map(rowToLink);
	}

	async insertLink(
		projectId: number,
		repoFullName: string,
		createdAt: string,
	): Promise<GithubLink> {
		const result = await this.db.execute({
			sql: `INSERT INTO github_link (project_id, repo_full_name, created_at)
				VALUES (?, ?, ?) RETURNING *`,
			args: [projectId, repoFullName, createdAt],
		});
		const row = result.rows[0];
		if (!row) throw new Error("INSERT sin fila devuelta");
		return rowToLink(row);
	}

	async removeLink(id: number): Promise<boolean> {
		const result = await this.db.execute({
			sql: "DELETE FROM github_link WHERE id = ?",
			args: [id],
		});
		return result.rowsAffected > 0;
	}

	/** Resuelve GP-42 → ítem, cruzando prefijo del proyecto y número. */
	async findItemByKey(
		prefix: string,
		keyNumber: number,
	): Promise<{ id: number; status: string } | null> {
		const result = await this.db.execute({
			sql: `SELECT item.id AS id, item.status AS status FROM item
				JOIN project ON project.id = item.project_id
				WHERE project.key_prefix = ? AND item.key_number = ?`,
			args: [prefix, keyNumber],
		});
		const row = result.rows[0];
		return row
			? { id: Number(row["id"]), status: String(row["status"]) }
			: null;
	}

	/** Inserta si no existe. Devuelve true solo si la fila es nueva. */
	async insertItemCommit(commit: {
		item_id: number;
		sha: string;
		message: string;
		url: string;
		committed_at: string;
	}): Promise<boolean> {
		const result = await this.db.execute({
			sql: `INSERT OR IGNORE INTO item_commit (item_id, sha, message, url, committed_at)
				VALUES (?, ?, ?, ?, ?)`,
			args: [
				commit.item_id,
				commit.sha,
				commit.message,
				commit.url,
				commit.committed_at,
			],
		});
		return result.rowsAffected > 0;
	}

	async listCommitsByItem(itemId: number): Promise<ItemCommit[]> {
		const result = await this.db.execute({
			sql: "SELECT * FROM item_commit WHERE item_id = ? ORDER BY committed_at DESC",
			args: [itemId],
		});
		return result.rows.map(rowToCommit);
	}
}
