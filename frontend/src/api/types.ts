/** Tipos espejo de los schemas Zod del backend. */

export type ItemType = "epic" | "task" | "subtask";
export type ItemStatus = "backlog" | "in_progress" | "blocked" | "done";

export interface Project {
	id: number;
	name: string;
	key_prefix: string;
	description: string | null;
	created_at: string;
	archived_at: string | null;
}

export interface Item {
	id: number;
	project_id: number;
	parent_id: number | null;
	type: ItemType;
	key: string;
	title: string;
	description: string | null;
	status: ItemStatus;
	start_date: string | null;
	end_date: string | null;
	estimate_min: number | null;
	created_at: string;
	updated_at: string;
}

export interface TimeLog {
	id: number;
	item_id: number;
	started_at: string;
	ended_at: string | null;
	duration_sec: number | null;
}

export interface TimelogSummary {
	item_id: number;
	total_sec: number;
	running: boolean;
	logs: TimeLog[];
}
