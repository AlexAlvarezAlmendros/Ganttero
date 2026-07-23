import type { CSSProperties, ReactNode } from "react";
import "./ds.css";

export interface ButtonProps {
	variant?: "primary" | "ghost" | "text" | "danger";
	size?: "md" | "sm";
	disabled?: boolean;
	onClick?: () => void;
	children: ReactNode;
	style?: CSSProperties;
}

export function Button({
	variant = "primary",
	size = "md",
	disabled = false,
	onClick,
	children,
	style,
}: ButtonProps) {
	const pad = size === "sm" ? "var(--pad-btn-sm)" : "var(--pad-btn)";
	const fontSize = size === "sm" ? "11px" : "12.5px";
	return (
		<button
			type="button"
			className={`gtr-btn gtr-btn--${variant}`}
			disabled={disabled}
			onClick={onClick}
			style={{ padding: variant === "text" ? 0 : pad, fontSize, ...style }}
		>
			{children}
		</button>
	);
}
