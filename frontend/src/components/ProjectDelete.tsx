import type { Project } from "../api/types.js";
import { Button } from "./ds/Button.js";
import { Dialog } from "./ds/Dialog.js";

export function ProjectDelete({
	project,
	itemCount,
	onClose,
	onConfirm,
}: {
	project: Project;
	itemCount: number | null;
	onClose: () => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog
			open
			title="Eliminar proyecto"
			onClose={onClose}
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						CANCELAR
					</Button>
					<Button variant="danger" size="sm" onClick={onConfirm}>
						ELIMINAR
					</Button>
				</>
			}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 10,
					fontFamily: "var(--font-mono)",
				}}
			>
				<span style={{ fontSize: 12.5, color: "var(--ink-1)" }}>
					{project.name}
					{itemCount !== null && ` — ${itemCount} ítems`}
				</span>
				<span style={{ fontSize: 10, color: "var(--sig-late)" }}>
					// se borran sus ítems y time_logs. no hay papelera.
				</span>
			</div>
		</Dialog>
	);
}
