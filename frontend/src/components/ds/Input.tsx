import type { CSSProperties } from "react";
import "./ds.css";

export interface InputProps {
	label?: string;
	hint?: string;
	multiline?: boolean;
	rows?: number;
	value?: string;
	placeholder?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	type?: string;
	style?: CSSProperties;
}

export function Input({
	label,
	hint,
	multiline = false,
	rows = 3,
	value,
	placeholder,
	onChange,
	disabled,
	type = "text",
	style,
}: InputProps) {
	const handle = onChange
		? (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
				onChange(event.target.value)
		: undefined;
	return (
		<label className="gtr-field" style={style}>
			{label && <span className="gtr-field__label">{label}</span>}
			{multiline ? (
				<textarea
					className="gtr-input"
					rows={rows}
					value={value}
					placeholder={placeholder}
					disabled={disabled}
					onChange={handle}
				/>
			) : (
				<input
					className="gtr-input"
					type={type}
					value={value}
					placeholder={placeholder}
					disabled={disabled}
					onChange={handle}
				/>
			)}
			{hint && <span className="gtr-field__hint">// {hint}</span>}
		</label>
	);
}
