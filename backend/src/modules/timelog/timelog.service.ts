import type { Item, ItemStatus } from "../items/items.schema.js";
import type { TimelogRepo } from "./timelog.repo.js";
import type { TimelogSummary } from "./timelog.schema.js";

/**
 * Cronometraje automático (regla de negocio clave):
 * entrar en `in_progress` abre un tramo; salir de `in_progress` lo cierra.
 * Reabrir suma un tramo nuevo; el total es la suma. Sin cronómetros manuales.
 */
export class TimelogService {
	constructor(
		private readonly repo: TimelogRepo,
		private readonly now: () => Date = () => new Date(),
	) {}

	async onStatusChange(item: Item, previous: ItemStatus): Promise<void> {
		const entering = item.status === "in_progress";
		const leaving = previous === "in_progress";

		if (entering && !leaving) {
			const open = await this.repo.findOpen(item.id);
			if (!open) {
				await this.repo.open(item.id, this.now().toISOString());
			}
		}

		if (leaving && !entering) {
			const open = await this.repo.findOpen(item.id);
			if (open) {
				const ended = this.now();
				const duration = Math.max(
					0,
					Math.round(
						(ended.getTime() - new Date(open.started_at).getTime()) / 1000,
					),
				);
				await this.repo.close(open.id, ended.toISOString(), duration);
			}
		}
	}

	async summary(itemId: number): Promise<TimelogSummary> {
		const logs = await this.repo.listByItem(itemId);
		const closed = logs.reduce((sum, log) => sum + (log.duration_sec ?? 0), 0);
		const open = logs.find((log) => log.ended_at === null);
		const runningElapsed = open
			? Math.max(
					0,
					Math.round(
						(this.now().getTime() - new Date(open.started_at).getTime()) / 1000,
					),
				)
			: 0;
		return {
			item_id: itemId,
			total_sec: closed + runningElapsed,
			running: Boolean(open),
			logs,
		};
	}
}
