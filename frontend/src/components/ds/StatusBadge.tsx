import type { CSSProperties } from "react";
import "./ds.css";

export type BadgeStatus =
	| "backlog"
	| "in_progress"
	| "blocked"
	| "done"
	| "late"
	| "now";

interface BadgeSpec {
	color: string;
	label: string;
	blink?: boolean;
	strike?: boolean;
}

const MAP: Record<BadgeStatus, BadgeSpec> = {
	backlog: { color: "var(--status-backlog)", label: "BACKLOG" },
	in_progress: {
		color: "var(--status-progress)",
		label: "EN CURSO",
		blink: true,
	},
	blocked: { color: "var(--status-blocked)", label: "BLOQUEADA" },
	done: { color: "var(--status-done)", label: "HECHA", strike: true },
	late: { color: "var(--sig-late)", label: "RETRASADA" },
	now: { color: "var(--sig-now)", label: "PARA YA", blink: true },
};

export interface StatusBadgeProps {
	status?: BadgeStatus;
	label?: string;
	style?: CSSProperties;
}

export function StatusBadge({
	status = "backlog",
	label,
	style,
}: StatusBadgeProps) {
	const spec = MAP[status];
	const text = label ?? spec.label;
	return (
		<span className="gtr-status" style={{ color: spec.color, ...style }}>
			<span
				className="gtr-status__dot"
				style={{
					background: spec.color,
					animation: spec.blink ? "blink 1.1s infinite" : undefined,
				}}
			/>
			{spec.strike ? <s>{text}</s> : text}
		</span>
	);
}
