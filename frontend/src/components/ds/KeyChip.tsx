import type { CSSProperties } from "react";
import "./ds.css";

export function KeyChip({
	id,
	muted = false,
	style,
}: {
	id: string;
	muted?: boolean;
	style?: CSSProperties;
}) {
	return (
		<span className={`gtr-key${muted ? " gtr-key--muted" : ""}`} style={style}>
			{id}
		</span>
	);
}
