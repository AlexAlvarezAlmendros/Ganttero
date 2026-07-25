import { useEffect, useState } from "react";
import type { Project } from "../api/types.js";

/** Selector `PROYECTO ▾` del kit: filas indexadas con ✎/✕ y + NUEVO PROYECTO. */
export function ProjectSelector({
	projects,
	active,
	onSelect,
	onNew,
	onEdit,
	onDelete,
}: {
	projects: Project[];
	active: Project | null;
	onSelect: (id: number) => void;
	onNew: () => void;
	onEdit: (project: Project) => void;
	onDelete: (project: Project) => void;
}) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		document.addEventListener("click", close);
		return () => document.removeEventListener("click", close);
	}, [open]);

	return (
		<div
			style={{ position: "relative", fontFamily: "var(--font-mono)" }}
			onClick={(event) => event.stopPropagation()}
		>
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: 10,
					background: "none",
					border: "1px solid var(--border-2)",
					color: "var(--ink-1)",
					cursor: "var(--cur-pointer)",
					fontFamily: "var(--font-mono)",
					fontSize: 11,
					fontWeight: 700,
					letterSpacing: ".06em",
					padding: "8px 12px",
				}}
			>
				<span
					style={{
						fontSize: "9.5px",
						fontWeight: 400,
						letterSpacing: ".1em",
						color: "var(--ink-5)",
					}}
				>
					PROYECTO
				</span>
				{active?.name ?? "—"}
				<span style={{ color: "var(--accent)", fontSize: 9 }}>▾</span>
			</button>
			{open && (
				<div
					style={{
						position: "absolute",
						top: "calc(100% + 4px)",
						left: 0,
						minWidth: 280,
						background: "var(--bg-1)",
						border: "1px solid var(--border-2)",
						zIndex: 150,
					}}
				>
					{projects.map((project, index) => (
						<div
							key={project.id}
							className="gt-projrow"
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								padding: "10px 12px",
								borderBottom: "1px solid var(--border-1)",
								cursor: "var(--cur-pointer)",
								background: project.id === active?.id ? "var(--bg-2)" : "none",
							}}
							onClick={() => {
								onSelect(project.id);
								setOpen(false);
							}}
						>
							<span style={{ color: "var(--accent)", fontSize: 10 }}>
								/{String(index + 1).padStart(2, "0")}
							</span>
							<span
								style={{
									flex: 1,
									fontSize: 11.5,
									fontWeight: project.id === active?.id ? 700 : 400,
									color: "var(--ink-1)",
								}}
							>
								{project.name}
								<span
									style={{
										display: "block",
										fontSize: 9.5,
										fontWeight: 400,
										color: "var(--ink-5)",
										marginTop: 2,
									}}
								>
									{project.description ?? `clave ${project.key_prefix}`}
								</span>
							</span>
							<button
								type="button"
								title="Editar"
								onClick={(event) => {
									event.stopPropagation();
									setOpen(false);
									onEdit(project);
								}}
								style={{
									background: "none",
									border: "none",
									color: "var(--ink-5)",
									cursor: "var(--cur-pointer)",
									fontFamily: "var(--font-mono)",
									fontSize: 11,
									padding: "2px 4px",
								}}
							>
								✎
							</button>
							<button
								type="button"
								title="Eliminar"
								onClick={(event) => {
									event.stopPropagation();
									setOpen(false);
									onDelete(project);
								}}
								style={{
									background: "none",
									border: "none",
									color: "var(--ink-5)",
									cursor: "var(--cur-pointer)",
									fontFamily: "var(--font-mono)",
									fontSize: 11,
									padding: "2px 4px",
								}}
							>
								✕
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							onNew();
						}}
						style={{
							display: "block",
							width: "100%",
							textAlign: "left",
							background: "none",
							border: "none",
							color: "var(--accent)",
							cursor: "var(--cur-pointer)",
							fontFamily: "var(--font-mono)",
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: ".04em",
							padding: "10px 12px",
						}}
					>
						+ NUEVO PROYECTO
					</button>
				</div>
			)}
		</div>
	);
}
