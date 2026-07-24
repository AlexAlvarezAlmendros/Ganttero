import { useRef, useState } from "react";
import type { Item } from "../api/types.js";
import {
	SCALES,
	addDays,
	barSpan,
	buildRows,
	daysBetween,
	headerTicks,
	pct,
	scaleRange,
} from "../lib/gantt.js";
import type { GanttScale } from "../lib/gantt.js";
import { KeyChip } from "./ds/KeyChip.js";
import { MicroLabel } from "./ds/MicroLabel.js";
import { Tabs } from "./ds/Tabs.js";

const LABEL_WIDTH = 290;

function barColor(item: Item): { background: string; opacity?: number } {
	if (item.status === "done")
		return { background: "var(--ink-5)", opacity: 0.5 };
	if (item.status === "blocked") return { background: "var(--sig-blocked)" };
	if (item.status === "in_progress") return { background: "var(--accent)" };
	return { background: "var(--ink-4)" };
}

/**
 * Gantt multi-escala a medida (decisión 3.1: el design system manda; una
 * librería no reproduce esta estética). "hoy" llega inyectado desde App.
 * Arrastrar una barra mueve el ítem en el tiempo (cuantizado a días).
 */
export function GanttView({
	items,
	today,
	onOpen,
	onMove,
}: {
	items: Item[];
	today: string;
	onOpen: (item: Item) => void;
	onMove: (item: Item, days: number) => void;
}) {
	const [scale, setScale] = useState<GanttScale>("mes");
	const [drag, setDrag] = useState<{ id: number; days: number } | null>(null);
	const timelineRef = useRef<HTMLDivElement>(null);
	const pointerStart = useRef<{ x: number; item: Item } | null>(null);

	const range = scaleRange(scale, today);
	const totalDays = daysBetween(range.start, range.end) + 1;
	const rows = buildRows(items, scale);
	const ticks = headerTicks(scale, range);
	const todayPct = pct(range, today);

	const pxPerDay = () => {
		const width = timelineRef.current?.getBoundingClientRect().width ?? 1;
		return width / totalDays;
	};

	const startDrag = (event: React.PointerEvent, item: Item) => {
		if (!item.start_date || !item.end_date) return;
		event.preventDefault();
		(event.target as HTMLElement).setPointerCapture(event.pointerId);
		pointerStart.current = { x: event.clientX, item };
		setDrag({ id: item.id, days: 0 });
	};

	const moveDrag = (event: React.PointerEvent) => {
		const start = pointerStart.current;
		if (!start) return;
		const days = Math.round((event.clientX - start.x) / pxPerDay());
		setDrag({ id: start.item.id, days });
	};

	const endDrag = () => {
		const start = pointerStart.current;
		if (!start) return;
		const days = drag?.days ?? 0;
		pointerStart.current = null;
		setDrag(null);
		if (days !== 0) {
			onMove(start.item, days);
		} else {
			onOpen(start.item);
		}
	};

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
				<Tabs
					items={SCALES.map(({ id, label, index }) => ({ id, label, index }))}
					active={scale}
					onChange={(id) => setScale(id as GanttScale)}
				/>
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
				style={{ border: "1px solid var(--border-1)", position: "relative" }}
			>
				<div
					style={{ display: "flex", borderBottom: "1px solid var(--border-1)" }}
				>
					<div
						style={{
							width: LABEL_WIDTH,
							flex: "none",
							padding: "8px 12px",
							borderRight: "1px solid var(--border-1)",
							boxSizing: "border-box",
						}}
					>
						<MicroLabel>ÍTEM</MicroLabel>
					</div>
					<div style={{ flex: 1, position: "relative", minHeight: 30 }}>
						{ticks.map((tick) => (
							<div
								key={tick.iso}
								style={{
									position: "absolute",
									left: `${pct(range, tick.iso)}%`,
									padding: "8px 8px",
									borderLeft: "1px solid var(--border-1)",
									height: "100%",
									boxSizing: "border-box",
									whiteSpace: "nowrap",
								}}
							>
								<MicroLabel>{tick.label}</MicroLabel>
							</div>
						))}
					</div>
				</div>

				<div
					style={{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${todayPct / 100})`,
						width: 0,
						borderLeft: "1px dashed var(--accent)",
						zIndex: 2,
						pointerEvents: "none",
					}}
				>
					<span
						style={{
							position: "absolute",
							top: 2,
							left: 4,
							fontFamily: "var(--font-mono)",
							fontSize: 9,
							color: "var(--accent)",
						}}
					>
						HOY
					</span>
				</div>

				{rows.map(({ item, depth }, rowIndex) => {
					const isEpic = item.type === "epic";
					const hasDates = Boolean(item.start_date && item.end_date);
					const dragging = drag?.id === item.id ? drag.days : 0;
					const span = hasDates
						? barSpan(
								range,
								addDays(item.start_date as string, dragging),
								addDays(item.end_date as string, dragging),
							)
						: null;
					return (
						<div
							key={item.id}
							className="gt-row"
							style={{
								display: "flex",
								borderBottom: "1px solid var(--border-1)",
								cursor: "pointer",
							}}
						>
							<div
								onClick={() => onOpen(item)}
								style={{
									width: LABEL_WIDTH,
									flex: "none",
									padding: "9px 12px",
									borderRight: "1px solid var(--border-1)",
									overflow: "hidden",
									whiteSpace: "nowrap",
									textOverflow: "ellipsis",
									boxSizing: "border-box",
								}}
							>
								{isEpic ? (
									<span
										style={{
											fontFamily: "var(--font-mono)",
											fontSize: 11.5,
											fontWeight: 700,
											color: "var(--ink-1)",
										}}
									>
										<span style={{ color: "var(--accent)", marginRight: 6 }}>
											▸
										</span>
										{item.title}
									</span>
								) : (
									<span
										style={{
											fontFamily: "var(--font-mono)",
											fontSize: 11,
											color: "var(--ink-3)",
											paddingLeft: depth * 18,
											display: "flex",
											gap: 8,
										}}
									>
										<KeyChip
											id={item.key}
											muted={item.status === "done"}
											style={{ fontSize: 10 }}
										/>
										{item.title}
									</span>
								)}
							</div>
							<div
								ref={rowIndex === 0 ? timelineRef : undefined}
								style={{ flex: 1, position: "relative", minHeight: 32 }}
							>
								{span ? (
									<div
										onPointerDown={(event) => startDrag(event, item)}
										onPointerMove={moveDrag}
										onPointerUp={endDrag}
										style={{
											position: "absolute",
											top: "50%",
											transform: "translateY(-50%)",
											left: `${span.left}%`,
											width: `${span.width}%`,
											touchAction: "none",
											cursor: dragging !== 0 ? "grabbing" : "grab",
											...(isEpic
												? {
														background: "var(--accent-dim)",
														border: "1px solid var(--accent)",
														height: 14,
													}
												: {
														...barColor(item),
														height: item.type === "subtask" ? 6 : 8,
													}),
											...(dragging !== 0
												? { outline: "1px dashed var(--accent)" }
												: {}),
										}}
									/>
								) : (
									<span
										onClick={() => onOpen(item)}
										style={{
											position: "absolute",
											top: "50%",
											transform: "translateY(-50%)",
											left: 8,
											fontFamily: "var(--font-mono)",
											fontSize: 9,
											color: "var(--ink-5)",
										}}
									>
										// sin fechas
									</span>
								)}
							</div>
						</div>
					);
				})}
				{rows.length === 0 && (
					<div style={{ padding: "18px 12px" }}>
						<MicroLabel>// sin ítems — crea una épica o una tarea</MicroLabel>
					</div>
				)}
			</div>
		</div>
	);
}
