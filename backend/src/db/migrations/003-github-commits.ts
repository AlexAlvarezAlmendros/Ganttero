import type { Migration } from "../migrations.js";

/** Fase 6: commits enlazados a ítems vía smart commits (GP-42 en el mensaje). */
export const githubCommits: Migration = {
	id: 3,
	name: "github-commits",
	up: async (db) => {
		await db.execute(`CREATE TABLE item_commit (
			id INTEGER PRIMARY KEY,
			item_id INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
			sha TEXT NOT NULL,
			message TEXT NOT NULL,
			url TEXT NOT NULL,
			committed_at TEXT NOT NULL,
			UNIQUE (item_id, sha)
		)`);
		await db.execute(
			"CREATE INDEX idx_item_commit_item ON item_commit(item_id)",
		);
	},
	down: async (db) => {
		await db.execute("DROP INDEX idx_item_commit_item");
		await db.execute("DROP TABLE item_commit");
	},
};
