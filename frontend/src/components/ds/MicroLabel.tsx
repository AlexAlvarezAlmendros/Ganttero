import type { CSSProperties, ReactNode } from "react";

export function MicroLabel({
	children,
	style,
}: {
	children: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<div
			style={{
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-micro)",
				letterSpacing: "var(--track-micro)",
				color: "var(--ink-5)",
				textTransform: "uppercase",
				...style,
			}}
		>
			{children}
		</div>
	);
}
