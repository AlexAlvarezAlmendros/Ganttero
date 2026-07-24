import { useState } from "react";
import type { Project } from "../api/types.js";
import { Button } from "./ds/Button.js";
import { Dialog } from "./ds/Dialog.js";
import { Input } from "./ds/Input.js";

export function ProjectDialog({
	project,
	currentRepo,
	onClose,
	onSave,
}: {
	/** null = crear nuevo */
	project: Project | null;
	/** Primer repo enlazado (Fase 6), si lo hay. */
	currentRepo?: string;
	onClose: () => void;
	onSave: (data: {
		id?: number;
		name: string;
		key_prefix: string;
		description: string | null;
		repo: string;
	}) => void;
}) {
	const isNew = project === null;
	const [name, setName] = useState(project?.name ?? "");
	const [prefix, setPrefix] = useState(project?.key_prefix ?? "");
	const [description, setDescription] = useState(project?.description ?? "");
	const [repo, setRepo] = useState(currentRepo ?? "");

	return (
		<Dialog
			open
			title={isNew ? "Nuevo proyecto" : `Editar · ${project.name}`}
			onClose={onClose}
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						CANCELAR
					</Button>
					<Button
						size="sm"
						disabled={
							!name.trim() ||
							(isNew && !/^[A-Za-z][A-Za-z0-9]{0,5}$/.test(prefix))
						}
						onClick={() =>
							onSave({
								...(project ? { id: project.id } : {}),
								name: name.trim().toUpperCase(),
								key_prefix: prefix.trim().toUpperCase(),
								description: description.trim() || null,
								repo: repo.trim(),
							})
						}
					>
						{isNew ? "CREAR" : "GUARDAR"}
					</Button>
				</>
			}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<Input
					label="Nombre"
					value={name}
					onChange={setName}
					placeholder="p. ej. HOMELAB"
				/>
				<Input
					label="Descripción"
					value={description}
					onChange={setDescription}
					placeholder="una línea basta"
				/>
				<Input
					label="Repo GitHub"
					value={repo}
					onChange={setRepo}
					placeholder="owner/repo"
					hint="opcional — smart commits con la clave del proyecto"
				/>
				<Input
					label="Prefijo de clave"
					value={prefix}
					onChange={setPrefix}
					disabled={!isNew}
					placeholder="GP"
					hint={
						isNew
							? "1-6 letras; da la clave de los ítems (GP-42) y los smart commits"
							: "fijo: las claves ya emitidas lo usan"
					}
				/>
			</div>
		</Dialog>
	);
}
