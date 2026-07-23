import { MicroLabel } from "../components/ds/MicroLabel.js";

const ZOOMS = ["AÑO", "6 MESES", "MES", "SEMANA", "DÍA"];

/** Esqueleto del Gantt multi-escala: la vista real llega en la Fase 3. */
export function GanttPage() {
	return (
		<div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-end",
					marginBottom: 14,
				}}
			>
				<div style={{ display: "flex", gap: 2 }}>
					{ZOOMS.map((zoom, index) => (
						<span
							key={zoom}
							style={{
								fontFamily: "var(--font-mono)",
								fontSize: 11,
								letterSpacing: "0.04em",
								padding: "8px 11px",
								color: index === 2 ? "var(--ink-1)" : "var(--ink-5)",
							}}
						>
							<span
								style={{ color: "var(--accent)", marginRight: 5, fontSize: 10 }}
							>
								/{String(index + 1).padStart(2, "0")}
							</span>
							{zoom}
						</span>
					))}
				</div>
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 10,
						color: "var(--ink-5)",
					}}
				>
					// el gantt manda — el kanban se deriva
				</span>
			</div>
			<div
				style={{
					border: "1px solid var(--border-1)",
					minHeight: 320,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<MicroLabel>// gantt multi-escala — fase 3</MicroLabel>
			</div>
		</div>
	);
}
