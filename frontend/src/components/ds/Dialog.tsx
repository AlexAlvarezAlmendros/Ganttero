import type { CSSProperties, ReactNode } from "react";
import "./ds.css";

export interface DialogProps {
	open?: boolean;
	title: string;
	onClose: () => void;
	footer?: ReactNode;
	children: ReactNode;
	style?: CSSProperties;
}

export function Dialog({
	open = false,
	title,
	onClose,
	footer,
	children,
	style,
}: DialogProps) {
	if (!open) return null;
	return (
		<div
			className="gtr-dialog__scrim"
			onKeyDown={(event) => event.key === "Escape" && onClose()}
			role="presentation"
		>
			{/* El clic en el scrim NO cierra: un formulario a medio rellenar no se
			    pierde por un clic fuera. Se sale por ✕, por CANCELAR o con Escape. */}
			<div
				className="gtr-dialog"
				style={style}
				role="dialog"
				aria-label={title}
			>
				<div className="gtr-dialog__head">
					<span className="gtr-dialog__title">{title}</span>
					<button type="button" className="gtr-dialog__x" onClick={onClose}>
						✕
					</button>
				</div>
				<div className="gtr-dialog__body">{children}</div>
				{footer && <div className="gtr-dialog__foot">{footer}</div>}
			</div>
		</div>
	);
}
