import type { Client } from "@libsql/client";
import type { Settings, UpdateSettings } from "./settings.schema.js";

/** Fila única (id = 1), sembrada por la migración inicial. */
export class SettingsRepo {
	constructor(private readonly db: Client) {}

	async get(): Promise<Settings> {
		const result = await this.db.execute(
			"SELECT kanban_window_days, retain_audio FROM settings WHERE id = 1",
		);
		const row = result.rows[0];
		if (!row) {
			throw new Error("settings sin sembrar (falta la migración inicial)");
		}
		return {
			kanban_window_days: Number(row["kanban_window_days"]),
			retain_audio: Number(row["retain_audio"]) === 1,
		};
	}

	async update(patch: UpdateSettings): Promise<Settings> {
		const sets: string[] = [];
		const args: Array<number> = [];
		if (patch.kanban_window_days !== undefined) {
			sets.push("kanban_window_days = ?");
			args.push(patch.kanban_window_days);
		}
		if (patch.retain_audio !== undefined) {
			sets.push("retain_audio = ?");
			args.push(patch.retain_audio ? 1 : 0);
		}
		if (sets.length > 0) {
			await this.db.execute({
				sql: `UPDATE settings SET ${sets.join(", ")} WHERE id = 1`,
				args,
			});
		}
		return this.get();
	}
}
