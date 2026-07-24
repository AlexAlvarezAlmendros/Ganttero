import type { Client } from "@libsql/client";
import type { Settings } from "./settings.schema.js";

/** Fila única (id = 1), sembrada por la migración inicial. */
export class SettingsRepo {
	constructor(private readonly db: Client) {}

	async get(): Promise<Settings> {
		const result = await this.db.execute(
			"SELECT kanban_window_days FROM settings WHERE id = 1",
		);
		const row = result.rows[0];
		if (!row) {
			throw new Error("settings sin sembrar (falta la migración inicial)");
		}
		return { kanban_window_days: Number(row["kanban_window_days"]) };
	}

	async update(settings: Settings): Promise<Settings> {
		await this.db.execute({
			sql: "UPDATE settings SET kanban_window_days = ? WHERE id = 1",
			args: [settings.kanban_window_days],
		});
		return this.get();
	}
}
