import { useState } from "react";
import { type CreateItemInput, useImproveDescription } from "../api/items.js";
import type { Item, ItemType } from "../api/types.js";
import { Button } from "./ds/Button.js";
import { Dialog } from "./ds/Dialog.js";
import { Input } from "./ds/Input.js";
import { MarkdownEditor } from "./ds/MarkdownEditor.js";
import { Select } from "./ds/Select.js";

/**
 * Alta manual de ítems (la captura por voz de la Fase 5 pre-rellenará
 * este mismo formulario). El padre se filtra según la jerarquía.
 */
export interface ItemDialogInitial {
	title?: string;
	type?: ItemType;
	start_date?: string | null;
	end_date?: string | null;
	estimate_min?: number | null;
	description?: string | null;
}

export function ItemDialog({
	projectId,
	items,
	initial,
	hint,
	onClose,
	onSave,
	onRecordVoice,
}: {
	projectId: number;
	items: Item[];
	/** Pre-relleno (captura por voz de la Fase 5). */
	initial?: ItemDialogInitial;
	/** Transcripción u otro contexto que ver mientras se revisa. */
	hint?: string;
	onClose: () => void;
	onSave: (data: CreateItemInput) => void;
	/** Abre la captura por voz para rellenar el formulario (opcional). */
	onRecordVoice?: () => void;
}) {
	const [type, setType] = useState<ItemType>(initial?.type ?? "task");
	const [title, setTitle] = useState(initial?.title ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [parent, setParent] = useState("");
	const improve = useImproveDescription();
	const [start, setStart] = useState(initial?.start_date ?? "");
	const [end, setEnd] = useState(initial?.end_date ?? "");
	const [estimate, setEstimate] = useState(
		initial?.estimate_min != null ? String(initial.estimate_min) : "",
	);

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
					{onRecordVoice && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onRecordVoice}
							style={{ marginRight: "auto" }}
						>
							🎙 GRABAR
						</Button>
					)}
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
								description: description.trim() || null,
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
				{hint && (
					<span
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 10,
							color: "var(--ink-4)",
							borderLeft: "2px solid var(--accent)",
							paddingLeft: 8,
						}}
					>
						«{hint}»
					</span>
				)}
				<Input
					label="Título"
					value={title}
					onChange={setTitle}
					placeholder="qué hay que hacer"
				/>
				<MarkdownEditor
					label="Descripción (opcional)"
					value={description}
					onChange={setDescription}
					placeholder="detalles, pasos, notas… (markdown)"
					improve={{
						run: async (current) =>
							(await improve.mutateAsync(current)).improved,
					}}
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
