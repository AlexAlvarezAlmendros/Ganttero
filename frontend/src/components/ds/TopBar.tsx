import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import "./ds.css";

export interface TopBarNavItem {
	id: string;
	label: string;
}

export interface TopBarProps {
	brand?: string;
	nav: TopBarNavItem[];
	active?: string;
	onNav?: (id: string) => void;
	right?: ReactNode;
	style?: CSSProperties;
}

export function TopBar({
	brand = "GANTTERO",
	nav,
	active,
	onNav,
	right,
	style,
}: TopBarProps) {
	// Reloj de la barra: UI pura, se permite la hora local del navegador.
	const [time, setTime] = useState("--:--:--");
	useEffect(() => {
		const timer = setInterval(
			() => setTime(new Date().toTimeString().slice(0, 8)),
			1000,
		);
		return () => clearInterval(timer);
	}, []);

	return (
		<header className="gtr-topbar" style={style}>
			<button type="button" className="gtr-topbar__brand">
				{brand}
				<span style={{ color: "var(--accent)" }}>™</span>
			</button>
			<div className="gtr-topbar__nav">
				{nav.map((item, index) => (
					<button
						type="button"
						key={item.id}
						className={`gtr-topbar__item${active === item.id ? " gtr-topbar__item--active" : ""}`}
						onClick={() => onNav?.(item.id)}
					>
						<span
							style={{ color: "var(--accent)", marginRight: 5, fontSize: 10 }}
						>
							/{String(index + 1).padStart(2, "0")}
						</span>
						{item.label}
					</button>
				))}
				<span className="gtr-topbar__clock">{time}</span>
				{right}
			</div>
		</header>
	);
}
