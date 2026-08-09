import { useState } from "react";
import { useItemCommits } from "../api/github.js";
import { useImproveDescription } from "../api/items.js";
import { useTimelog } from "../api/timelogs.js";
import type { Item, ItemStatus } from "../api/types.js";
import { formatDuration } from "../lib/format.js";
import { parentCandidates, parentFieldLabel } from "../lib/hierarchy.js";
import { Button } from "./ds/Button.js";
import { Dialog } from "./ds/Dialog.js";
import { Input } from "./ds/Input.js";
import { MarkdownEditor } from "./ds/MarkdownEditor.js";
import { MicroLabel } from "./ds/MicroLabel.js";
import { Select } from "./ds/Select.js";
import { StatusBadge } from "./ds/StatusBadge.js";

export function TaskDetail({
	task,
	items,
	onClose,
	onStatus,
	onSave,
	onDelete,
}: {
	task: Item;
	/** Ítems del proyecto: candidatos a padre al reasignar la jerarquía. */
	items: Item[];
	onClose: () => void;
	onStatus: (item: Item, status: ItemStatus) => void;
	onSave: (
		item: Item,
		patch: {
			title?: string;
			description?: string | null;
			parent_id?: number | null;
			start_date?: string | null;
			end_date?: string | null;
			estimate_min?: number | null;
		},
	) => void;
	onDelete: (item: Item) => void;
}) {
	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description ?? "");
	const [parent, setParent] = useState(
		task.parent_id !== null ? String(task.parent_id) : "",
	);
	const [start, setStart] = useState(task.start_date ?? "");
	const [end, setEnd] = useState(task.end_date ?? "");
	const [estimate, setEstimate] = useState(
		task.estimate_min !== null ? String(task.estimate_min) : "",
	);
	const timelog = useTimelog(task.id);
	const commits = useItemCommits(task.id);
	const improve = useImproveDescription();
	// En la vista de todos los proyectos llegan ítems de varios: un padre solo
	// vale dentro del mismo proyecto (el backend lo rechazaría igualmente).
	const parents = parentCandidates(
		items.filter((item) => item.project_id === task.project_id),
		task.type,
		task.id,
	);

	return (
		<Dialog
			open
			title={`${task.key} · detalle`}
			onClose={onClose}
			footer={
				<>
					<Button
						variant="danger"
						size="sm"
						onClick={() => onDelete(task)}
						style={{ marginRight: "auto" }}
					>
						ELIMINAR
					</Button>
					<Button variant="ghost" size="sm" onClick={onClose}>
						CERRAR
					</Button>
					<Button
						size="sm"
						disabled={!title.trim() || (task.type === "subtask" && !parent)}
						onClick={() =>
							onSave(task, {
								title: title.trim(),
								description: description.trim() || null,
								...(task.type === "epic"
									? {}
									: { parent_id: parent ? Number(parent) : null }),
								start_date: start || null,
								end_date: end || null,
								estimate_min: estimate ? Number(estimate) : null,
							})
						}
					>
						GUARDAR
					</Button>
				</>
			}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: 10,
					}}
				>
					<Input value={title} onChange={setTitle} style={{ flex: 1 }} />
					<StatusBadge status={task.status} />
				</div>
				<MarkdownEditor
					label="Descripción"
					value={description}
					onChange={setDescription}
					placeholder="detalles, pasos, notas… (markdown)"
					improve={{
						run: async (current) =>
							(await improve.mutateAsync(current)).improved,
					}}
				/>
				<div
					style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
				>
					<Select
						label="Estado"
						value={task.status}
						onChange={(value) => onStatus(task, value as ItemStatus)}
						options={[
							{ value: "backlog", label: "BACKLOG" },
							{ value: "in_progress", label: "EN CURSO" },
							{ value: "blocked", label: "BLOQUEADA" },
							{ value: "done", label: "HECHA" },
						]}
					/>
					<Input
						label="Estimación (min)"
						type="number"
						value={estimate}
						onChange={setEstimate}
					/>
					<Input label="Inicio" type="date" value={start} onChange={setStart} />
					<Input label="Fin" type="date" value={end} onChange={setEnd} />
					{task.type !== "epic" && (
						<Select
							label={parentFieldLabel(task.type)}
							value={parent}
							onChange={setParent}
							style={{ gridColumn: "1 / -1" }}
							options={[
								{
									value: "",
									label: task.type === "subtask" ? "— elige —" : "— ninguna —",
								},
								...parents.map((candidate) => ({
									value: String(candidate.id),
									label: `${candidate.key} · ${candidate.title}`,
								})),
							]}
						/>
					)}
				</div>
				<div>
					<MicroLabel style={{ marginBottom: 8 }}>
						TIEMPO REGISTRADO (AUTO)
					</MicroLabel>
					<div
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 11,
							color: timelog.data?.total_sec ? "var(--ink-2)" : "var(--ink-5)",
						}}
					>
						{timelog.data && timelog.data.total_sec > 0
							? `⏱ ${formatDuration(timelog.data.total_sec)}${timelog.data.running ? " · tramo abierto" : ""} · abre/cierra con el estado`
							: "// aún sin tramos — pasa a EN CURSO para abrir uno"}
					</div>
				</div>
				<div>
					<MicroLabel style={{ marginBottom: 8 }}>GITHUB</MicroLabel>
					{(commits.data ?? []).map((commit) => (
						<div
							key={commit.sha}
							style={{
								fontFamily: "var(--font-mono)",
								fontSize: 11,
								color: "var(--ink-3)",
								padding: "6px 0",
								borderBottom: "1px solid var(--border-1)",
								display: "flex",
								gap: 10,
							}}
						>
							<a
								href={commit.url}
								target="_blank"
								rel="noreferrer"
								style={{ color: "var(--accent)" }}
							>
								{commit.sha.slice(0, 7)}
							</a>
							<span style={{ flex: 1 }}>{commit.message}</span>
						</div>
					))}
					{(commits.data ?? []).length === 0 && (
						<div
							style={{
								fontFamily: "var(--font-mono)",
								fontSize: 11,
								color: "var(--ink-5)",
							}}
						>
							// cita {task.key} en un commit para enlazarlo
						</div>
					)}
				</div>
			</div>
		</Dialog>
	);
}
