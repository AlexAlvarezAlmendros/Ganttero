import { useState } from "react";
import type { KanbanBoardData, KanbanCard } from "../api/kanban.js";
import type { ItemStatus } from "../api/types.js";
import { formatDateRange, formatEstimate } from "../lib/format.js";
import { MicroLabel } from "./ds/MicroLabel.js";
import { StatusBadge } from "./ds/StatusBadge.js";
import { TaskCard } from "./ds/TaskCard.js";

const COLUMNS: ItemStatus[] = ["backlog", "in_progress", "blocked", "done"];

/**
 * Tablero 100 % DERIVADO del Gantt (Fase 4): las tarjetas, su orden y su
 * prioridad llegan calculadas del backend. Aquí solo se pinta y se arrastra.
 */
export function KanbanBoard({
	board,
	onOpen,
	onStatusChange,
}: {
	board: KanbanBoardData | undefined;
	onOpen: (card: KanbanCard) => void;
	onStatusChange: (card: KanbanCard, status: ItemStatus) => void;
}) {
	const [overColumn, setOverColumn] = useState<ItemStatus | null>(null);
	const allCards = board ? Object.values(board.columns).flat() : [];

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(4, 1fr)",
				gap: 10,
				alignItems: "start",
			}}
		>
			{COLUMNS.map((status) => {
				const list = board?.columns[status] ?? [];
				return (
					<div
						key={status}
						onDragOver={(event) => {
							event.preventDefault();
							setOverColumn(status);
						}}
						onDragLeave={() => setOverColumn(null)}
						onDrop={(event) => {
							event.preventDefault();
							setOverColumn(null);
							const id = Number(event.dataTransfer.getData("text/plain"));
							const card = allCards.find((candidate) => candidate.id === id);
							if (card && card.status !== status) {
								onStatusChange(card, status);
							}
						}}
						style={{
							border: `1px solid ${overColumn === status ? "var(--accent)" : "var(--border-1)"}`,
							minHeight: 420,
							display: "flex",
							flexDirection: "column",
							transition: "border-color .15s",
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
								{String(list.length).padStart(2, "0")}
							</span>
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 8,
								padding: 8,
							}}
						>
							{list.map((card) => (
								<TaskCard
									key={card.id}
									id={card.key}
									title={card.title}
									priority={card.priority === "done" ? "normal" : card.priority}
									done={card.status === "done"}
									dates={formatDateRange(card.start_date, card.end_date)}
									estimate={
										card.estimate_min !== null
											? formatEstimate(card.estimate_min)
											: undefined
									}
									onClick={() => onOpen(card)}
									draggable
									onDragStart={(event) =>
										event.dataTransfer.setData("text/plain", String(card.id))
									}
								/>
							))}
							{list.length === 0 && (
								<MicroLabel style={{ padding: "14px 6px" }}>
									// vacío
								</MicroLabel>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
