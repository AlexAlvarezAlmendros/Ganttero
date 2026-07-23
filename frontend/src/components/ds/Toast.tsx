import type { CSSProperties, ReactNode } from "react";
import "./ds.css";

export interface ToastProps {
	kind?: "info" | "error" | "warn";
	onDismiss?: () => void;
	children: ReactNode;
	style?: CSSProperties;
}

export function Toast({
	kind = "info",
	onDismiss,
	children,
	style,
}: ToastProps) {
	return (
		<div
			className={`gtr-toast${kind !== "info" ? ` gtr-toast--${kind}` : ""}`}
			style={style}
		>
			<span>{children}</span>
			{onDismiss && (
				<button type="button" className="gtr-toast__x" onClick={onDismiss}>
					✕
				</button>
			)}
		</div>
	);
}
