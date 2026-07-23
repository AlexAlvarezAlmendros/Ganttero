import { MicroLabel } from "../components/ds/MicroLabel.js";
import { StatusBadge } from "../components/ds/StatusBadge.js";
import type { BadgeStatus } from "../components/ds/StatusBadge.js";

const COLUMNS: BadgeStatus[] = ["backlog", "in_progress", "blocked", "done"];

/** Esqueleto del tablero: las tarjetas llegan derivadas del Gantt en la Fase 2/4. */
export function KanbanPage() {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(4, 1fr)",
				gap: 10,
				alignItems: "start",
			}}
		>
			{COLUMNS.map((status) => (
				<div
					key={status}
					style={{
						border: "1px solid var(--border-1)",
						minHeight: 420,
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "10px 12px",
							borderBottom: "1px solid var(--border-1)",
						}}
					>
						<StatusBadge status={status} />
						<span
							style={{
								fontFamily: "var(--font-mono)",
								fontSize: 10,
								color: "var(--ink-5)",
							}}
						>
							00
						</span>
					</div>
					<div style={{ padding: "14px 12px" }}>
						<MicroLabel>
							// vacío — el kanban se deriva del gantt (fase 4)
						</MicroLabel>
					</div>
				</div>
			))}
		</div>
	);
}
