import type { CSSProperties } from "react";
import "./ds.css";

export interface TabItem {
	id: string;
	label: string;
	index?: string;
}

export function Tabs({
	items,
	active,
	onChange,
	style,
}: {
	items: TabItem[];
	active?: string;
	onChange?: (id: string) => void;
	style?: CSSProperties;
}) {
	return (
		<div className="gtr-tabs" style={style}>
			{items.map((item, position) => {
				const on = active !== undefined ? active === item.id : position === 0;
				return (
					<button
						type="button"
						key={item.id}
						className={`gtr-tab${on ? " gtr-tab--active" : ""}`}
						onClick={() => onChange?.(item.id)}
					>
						{item.index && (
							<span style={{ color: "var(--accent)", marginRight: 6 }}>
								{item.index}
							</span>
						)}
						{item.label}
					</button>
				);
			})}
		</div>
	);
}
