import { useState } from "react";
import type { CreateItemInput } from "../api/items.js";
import type { Item, ItemType } from "../api/types.js";
import { Button } from "./ds/Button.js";
import { Dialog } from "./ds/Dialog.js";
import { Input } from "./ds/Input.js";
import { Select } from "./ds/Select.js";

/**
 * Alta manual de ítems (la captura por voz de la Fase 5 pre-rellenará
 * este mismo formulario). El padre se filtra según la jerarquía.
 */
export function ItemDialog({
	projectId,
	items,
	onClose,
	onSave,
}: {
	projectId: number;
	items: Item[];
	onClose: () => void;
	onSave: (data: CreateItemInput) => void;
}) {
	const [type, setType] = useState<ItemType>("task");
	const [title, setTitle] = useState("");
	const [parent, setParent] = useState("");
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");
	const [estimate, setEstimate] = useState("");

	const parents =
		type === "task"
			? items.filter((item) => item.type === "epic")
			: type === "subtask"
				? items.filter((item) => item.type === "task")
				: [];

	return (
		<Dialog
			open
			title="Nueva tarea"
			onClose={onClose}
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						CANCELAR
					</Button>
					<Button
						size="sm"
						disabled={!title.trim() || (type === "subtask" && !parent)}
						onClick={() =>
							onSave({
								project_id: projectId,
								type,
								title: title.trim(),
								parent_id: parent ? Number(parent) : null,
								start_date: start || null,
								end_date: end || null,
								estimate_min: estimate ? Number(estimate) : null,
							})
						}
					>
						CREAR
					</Button>
				</>
			}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<Input
					label="Título"
					value={title}
					onChange={setTitle}
					placeholder="qué hay que hacer"
				/>
				<div
					style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}
				>
					<Select
						label="Tipo"
						value={type}
						onChange={(value) => {
							setType(value as ItemType);
							setParent("");
						}}
						options={[
							{ value: "task", label: "TAREA" },
							{ value: "epic", label: "ÉPICA" },
							{ value: "subtask", label: "SUBTAREA" },
						]}
					/>
					<Select
						label={type === "subtask" ? "Tarea madre" : "Épica (opcional)"}
						value={parent}
						onChange={setParent}
						disabled={type === "epic"}
						options={[
							{
								value: "",
								label: type === "subtask" ? "— elige —" : "— ninguna —",
							},
							...parents.map((candidate) => ({
								value: String(candidate.id),
								label: `${candidate.key} · ${candidate.title}`,
							})),
						]}
					/>
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr",
						gap: 10,
					}}
				>
					<Input label="Inicio" type="date" value={start} onChange={setStart} />
					<Input label="Fin" type="date" value={end} onChange={setEnd} />
					<Input
						label="Estimación (min)"
						type="number"
						value={estimate}
						onChange={setEstimate}
					/>
				</div>
			</div>
		</Dialog>
	);
}
