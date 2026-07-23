import type { CSSProperties, ReactNode } from "react";
import "./ds.css";

export interface IconButtonProps {
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	children: ReactNode;
	style?: CSSProperties;
}

export function IconButton({
	label,
	active = false,
	disabled = false,
	onClick,
	children,
	style,
}: IconButtonProps) {
	return (
		<button
			type="button"
			className={`gtr-iconbtn${active ? " gtr-iconbtn--active" : ""}`}
			title={label}
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			style={style}
		>
			{children}
		</button>
	);
}
