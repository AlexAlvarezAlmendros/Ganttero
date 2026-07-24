import type { CSSProperties } from "react";
import { KeyChip } from "./KeyChip.js";
import { StatusBadge } from "./StatusBadge.js";
import "./ds.css";

export type TaskPriority = "late" | "now" | "blocked" | "normal";

export interface TaskCardProps {
	id: string;
	title: string;
	priority?: TaskPriority;
	done?: boolean;
	dates?: string | undefined;
	estimate?: string | undefined;
	timeLogged?: string | undefined;
	onClick?: () => void;
	draggable?: boolean;
	onDragStart?: (event: React.DragEvent) => void;
	style?: CSSProperties;
}

export function TaskCard({
	id,
	title,
	priority = "normal",
	done = false,
	dates,
	estimate,
	timeLogged,
	onClick,
	draggable,
	onDragStart,
	style,
}: TaskCardProps) {
	const edge = done
		? ""
		: ({
				late: " gtr-task--late",
				now: " gtr-task--now",
				blocked: " gtr-task--blocked",
			}[priority as string] ?? "");
	return (
		<div
			className={`gtr-task${edge}${done ? " gtr-task--done" : ""}`}
			onClick={onClick}
			draggable={draggable}
			onDragStart={onDragStart}
			style={style}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: 8,
				}}
			>
				<KeyChip id={id} muted={done} />
				{done ? (
					<StatusBadge status="done" />
				) : (
					priority !== "normal" && (
						<StatusBadge
							status={priority === "blocked" ? "blocked" : priority}
						/>
					)
				)}
			</div>
			<div className="gtr-task__title">{title}</div>
			<div className="gtr-task__meta">
				{dates && <span>{dates}</span>}
				{estimate && <span>est {estimate}</span>}
				{timeLogged && (
					<span style={{ color: "var(--ink-4)" }}>⏱ {timeLogged}</span>
				)}
			</div>
		</div>
	);
}
