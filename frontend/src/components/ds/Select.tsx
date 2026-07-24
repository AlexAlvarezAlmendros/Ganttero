import type { CSSProperties } from "react";
import "./ds.css";

export interface SelectOption {
	value: string;
	label: string;
}

export function Select({
	label,
	options,
	value,
	onChange,
	disabled,
	style,
}: {
	label?: string;
	options: Array<SelectOption | string>;
	value?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	style?: CSSProperties;
}) {
	return (
		<label className="gtr-field" style={style}>
			{label && <span className="gtr-field__label">{label}</span>}
			<select
				className="gtr-select"
				value={value}
				disabled={disabled}
				onChange={
					onChange ? (event) => onChange(event.target.value) : undefined
				}
			>
				{options.map((option) => {
					const item =
						typeof option === "string"
							? { value: option, label: option }
							: option;
					return (
						<option key={item.value} value={item.value}>
							{item.label}
						</option>
					);
				})}
			</select>
		</label>
	);
}
