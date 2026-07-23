import { useState } from "react";
import type { Item, ItemStatus } from "../api/types.js";
import { formatDateRange, formatEstimate } from "../lib/format.js";
import { MicroLabel } from "./ds/MicroLabel.js";
import { StatusBadge } from "./ds/StatusBadge.js";
import { TaskCard } from "./ds/TaskCard.js";

const COLUMNS: ItemStatus[] = ["backlog", "in_progress", "blocked", "done"];

/**
 * Tablero por estados con drag & drop nativo. Las tarjetas son tareas y
 * subtareas (las épicas viven en el Gantt). La prioridad derivada llega
 * con el motor de la Fase 4; hasta entonces solo se señala `blocked`.
 */
export function KanbanBoard({
	items,
	onOpen,
	onStatusChange,
}: {
	items: Item[];
	onOpen: (item: Item) => void;
	onStatusChange: (item: Item, status: ItemStatus) => void;
}) {
	const [overColumn, setOverColumn] = useState<ItemStatus | null>(null);
	const cards = items.filter((item) => item.type !== "epic");

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
				const list = cards.filter((item) => item.status === status);
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
							const item = cards.find((candidate) => candidate.id === id);
							if (item && item.status !== status) {
								onStatusChange(item, status);
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
							{list.map((item) => (
								<TaskCard
									key={item.id}
									id={item.key}
									title={item.title}
									priority={item.status === "blocked" ? "blocked" : "normal"}
									done={item.status === "done"}
									dates={formatDateRange(item.start_date, item.end_date)}
									estimate={
										item.estimate_min !== null
											? formatEstimate(item.estimate_min)
											: undefined
									}
									onClick={() => onOpen(item)}
									draggable
									onDragStart={(event) =>
										event.dataTransfer.setData("text/plain", String(item.id))
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
