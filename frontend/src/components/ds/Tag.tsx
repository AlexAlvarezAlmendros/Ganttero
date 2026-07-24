import type { CSSProperties, ReactNode } from "react";
import "./ds.css";

export function Tag({
	variant = "outline",
	children,
	style,
}: {
	variant?: "outline" | "accent" | "solid";
	children: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<span
			className={`gtr-tag${variant !== "outline" ? ` gtr-tag--${variant}` : ""}`}
			style={style}
		>
			{children}
		</span>
	);
}
