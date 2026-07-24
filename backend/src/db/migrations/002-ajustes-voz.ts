import type { Migration } from "../migrations.js";

/** Fase 5: preferencia de retención de audios tras transcribir. */
export const ajustesVoz: Migration = {
	id: 2,
	name: "ajustes-voz",
	up: async (db) => {
		await db.execute(
			"ALTER TABLE settings ADD COLUMN retain_audio INTEGER NOT NULL DEFAULT 1",
		);
	},
	down: async (db) => {
		await db.execute("ALTER TABLE settings DROP COLUMN retain_audio");
	},
};
