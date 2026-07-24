import type { CSSProperties } from "react";
import "./ds.css";

export function Switch({
	checked = false,
	onChange,
	label,
	disabled,
	style,
}: {
	checked?: boolean;
	onChange?: (checked: boolean) => void;
	label?: string;
	disabled?: boolean;
	style?: CSSProperties;
}) {
	return (
		<button
			type="button"
			className={`gtr-switch${disabled ? " gtr-switch--disabled" : ""}`}
			style={{ background: "none", border: "none", padding: 0, ...style }}
			onClick={() => onChange?.(!checked)}
		>
			<span
				className={`gtr-switch__track${checked ? " gtr-switch__track--on" : ""}`}
			>
				<span className="gtr-switch__knob" />
			</span>
			{label && <span>{label}</span>}
		</button>
	);
}
