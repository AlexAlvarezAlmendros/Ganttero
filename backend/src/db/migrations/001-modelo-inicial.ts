import type { Client } from "../client.js";
import type { Migration } from "../migrations.js";

/**
 * Modelo de datos inicial (architecture.md §4).
 * Fechas/timestamps: ISO-8601 UTC como TEXT. `item` es auto-referenciada
 * (parent_id + type) para la jerarquía épica → tarea → subtarea.
 * La prioridad NO se persiste: es derivada (regla de negocio).
 */

const UP = [
	`CREATE TABLE project (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		key_prefix TEXT NOT NULL UNIQUE,
		description TEXT,
		created_at TEXT NOT NULL,
		archived_at TEXT
	)`,

	`CREATE TABLE item (
		id INTEGER PRIMARY KEY,
		project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
		parent_id INTEGER REFERENCES item(id) ON DELETE CASCADE,
		type TEXT NOT NULL CHECK (type IN ('epic', 'task', 'subtask')),
		key_number INTEGER NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		status TEXT NOT NULL DEFAULT 'backlog'
			CHECK (status IN ('backlog', 'in_progress', 'blocked', 'done')),
		start_date TEXT,
		end_date TEXT,
		estimate_min INTEGER CHECK (estimate_min IS NULL OR estimate_min > 0),
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		UNIQUE (project_id, key_number),
		CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
	)`,
	"CREATE INDEX idx_item_project ON item(project_id)",
	"CREATE INDEX idx_item_parent ON item(parent_id)",
	// El motor de ventana Gantt→Kanban filtra por rango de fechas y estado.
	"CREATE INDEX idx_item_window ON item(start_date, end_date)",
	"CREATE INDEX idx_item_status ON item(status)",

	`CREATE TABLE time_log (
		id INTEGER PRIMARY KEY,
		item_id INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
		started_at TEXT NOT NULL,
		ended_at TEXT,
		duration_sec INTEGER CHECK (duration_sec IS NULL OR duration_sec >= 0)
	)`,
	"CREATE INDEX idx_time_log_item ON time_log(item_id)",

	`CREATE TABLE github_link (
		id INTEGER PRIMARY KEY,
		project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
		repo_full_name TEXT NOT NULL,
		created_at TEXT NOT NULL,
		UNIQUE (project_id, repo_full_name)
	)`,

	`CREATE TABLE settings (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		kanban_window_days INTEGER NOT NULL DEFAULT 14
			CHECK (kanban_window_days > 0)
	)`,
	"INSERT INTO settings (id) VALUES (1)",

	`CREATE TABLE dependency (
		from_item INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
		to_item INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
		PRIMARY KEY (from_item, to_item),
		CHECK (from_item <> to_item)
	) WITHOUT ROWID`,
];

const DOWN = [
	"DROP TABLE dependency",
	"DROP TABLE settings",
	"DROP TABLE github_link",
	"DROP TABLE time_log",
	"DROP INDEX idx_item_status",
	"DROP INDEX idx_item_window",
	"DROP INDEX idx_item_parent",
	"DROP INDEX idx_item_project",
	"DROP TABLE item",
	"DROP TABLE project",
];

async function run(db: Client, statements: readonly string[]): Promise<void> {
	for (const statement of statements) {
		await db.execute(statement);
	}
}

export const modeloInicial: Migration = {
	id: 1,
	name: "modelo-inicial",
	up: (db) => run(db, UP),
	down: (db) => run(db, DOWN),
};
