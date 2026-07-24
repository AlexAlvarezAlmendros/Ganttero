import type { Client, Row } from "@libsql/client";
import type { TimeLog } from "./timelog.schema.js";

function rowToLog(row: Row): TimeLog {
	return {
		id: Number(row["id"]),
		item_id: Number(row["item_id"]),
		started_at: String(row["started_at"]),
		ended_at: row["ended_at"] === null ? null : String(row["ended_at"]),
		duration_sec:
			row["duration_sec"] === null ? null : Number(row["duration_sec"]),
	};
}

export class TimelogRepo {
	constructor(private readonly db: Client) {}

	async listByItem(itemId: number): Promise<TimeLog[]> {
		const result = await this.db.execute({
			sql: "SELECT * FROM time_log WHERE item_id = ? ORDER BY started_at, id",
			args: [itemId],
		});
		return result.rows.map(rowToLog);
	}

	async findOpen(itemId: number): Promise<TimeLog | null> {
		const result = await this.db.execute({
			sql: "SELECT * FROM time_log WHERE item_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1",
			args: [itemId],
		});
		const row = result.rows[0];
		return row ? rowToLog(row) : null;
	}

	async open(itemId: number, startedAt: string): Promise<TimeLog> {
		const result = await this.db.execute({
			sql: "INSERT INTO time_log (item_id, started_at) VALUES (?, ?) RETURNING *",
			args: [itemId, startedAt],
		});
		const row = result.rows[0];
		if (!row) {
			throw new Error("INSERT sin fila devuelta");
		}
		return rowToLog(row);
	}

	async close(id: number, endedAt: string, durationSec: number): Promise<void> {
		await this.db.execute({
			sql: "UPDATE time_log SET ended_at = ?, duration_sec = ? WHERE id = ?",
			args: [endedAt, durationSec, id],
		});
	}
}
