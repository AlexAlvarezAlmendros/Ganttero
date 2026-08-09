import { useMemo, useState } from "react";
import type { Item, ItemStatus, Project } from "../api/types.js";
import {
	type BacklogFilters,
	DATE_FILTERS,
	NO_FILTERS,
	effectiveRange,
	epicIdOf,
	epicsOf,
	filterBacklog,
	hasActiveFilters,
} from "../lib/backlog.js";
import { formatDateRange, formatEstimate } from "../lib/format.js";
import { Button } from "./ds/Button.js";
import { Input } from "./ds/Input.js";
import { KeyChip } from "./ds/KeyChip.js";
import { MicroLabel } from "./ds/MicroLabel.js";
import { Select } from "./ds/Select.js";
import { StatusBadge } from "./ds/StatusBadge.js";

const STATUS_OPTIONS = [
	{ value: "all", label: "TODOS" },
	{ value: "backlog", label: "BACKLOG" },
	{ value: "in_progress", label: "EN CURSO" },
	{ value: "blocked", label: "BLOQUEADA" },
	{ value: "done", label: "HECHA" },
];

const cell: React.CSSProperties = {
	fontFamily: "var(--font-mono)",
	fontSize: 11,
	color: "var(--ink-3)",
	whiteSpace: "nowrap",
};

/**
 * Backlog: TODAS las tareas del proyecto, planificadas o no, dentro o fuera de
 * la ventana del Kanban. Es la vista que no esconde nada — el sitio donde
 * aparcar lo que aún no tiene "cuándo" y encontrar lo que se salió del radar.
 */
export function BacklogView({
	items,
	projects = [],
	showProject = false,
	today,
	windowDays,
	onOpen,
}: {
	items: Item[];
	/** Proyectos del ámbito; solo se usan en la vista de todos los proyectos. */
	projects?: Project[];
	/** Añade la columna y el filtro PROYECTO (vista de todos los proyectos). */
	showProject?: boolean;
	/** "Hoy" inyectado desde App (nunca se calcula aquí). */
	today: string;
	windowDays: number;
	onOpen: (item: Item) => void;
}) {
	const [filters, setFilters] = useState<BacklogFilters>(NO_FILTERS);
	const patch = (change: Partial<BacklogFilters>) =>
		setFilters((current) => ({ ...current, ...change }));

	const epics = useMemo(() => epicsOf(items), [items]);
	const projectsById = useMemo(
		() => new Map(projects.map((project) => [project.id, project])),
		[projects],
	);
	const byId = useMemo(
		() => new Map(items.map((item) => [item.id, item])),
		[items],
	);
	const rows = useMemo(
		() => filterBacklog(items, filters, today, windowDays),
		[items, filters, today, windowDays],
	);
	const total = items.filter((item) => item.type !== "epic").length;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: showProject
						? "1fr 1fr 1fr 1.4fr 1fr 1fr auto"
						: "1fr 1fr 1.4fr 1fr 1fr auto",
					gap: 10,
					alignItems: "end",
					border: "1px solid var(--border-1)",
					padding: "12px 14px",
				}}
			>
				{showProject && (
					<Select
						label="Proyecto"
						value={String(filters.project)}
						onChange={(value) =>
							patch({ project: value === "all" ? "all" : Number(value) })
						}
						options={[
							{ value: "all", label: "TODOS" },
							...projects.map((project) => ({
								value: String(project.id),
								label: `${project.key_prefix} · ${project.name}`,
							})),
						]}
					/>
				)}
				<Select
					label="Estado"
					value={filters.status}
					onChange={(value) => patch({ status: value as ItemStatus | "all" })}
					options={STATUS_OPTIONS}
				/>
				<Select
					label="Fecha"
					value={filters.date}
					onChange={(value) => patch({ date: value as BacklogFilters["date"] })}
					options={DATE_FILTERS.map((option) => ({
						value: option.value,
						label: option.label,
					}))}
				/>
				<Select
					label="Épica"
					value={String(filters.epic)}
					onChange={(value) =>
						patch({
							epic: value === "all" || value === "none" ? value : Number(value),
						})
					}
					options={[
						{ value: "all", label: "TODAS" },
						{ value: "none", label: "— SIN ÉPICA —" },
						...epics.map((epic) => ({
							value: String(epic.id),
							label: `${epic.key} · ${epic.title}`,
						})),
					]}
				/>
				<Input
					label="Desde"
					type="date"
					value={filters.from}
					onChange={(value) => patch({ from: value })}
				/>
				<Input
					label="Hasta"
					type="date"
					value={filters.to}
					onChange={(value) => patch({ to: value })}
				/>
				<Button
					variant="ghost"
					size="sm"
					disabled={!hasActiveFilters(filters)}
					onClick={() => setFilters(NO_FILTERS)}
				>
					LIMPIAR
				</Button>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<MicroLabel>
					{showProject
						? "TAREAS DE TODOS LOS PROYECTOS"
						: "TAREAS DEL PROYECTO"}
				</MicroLabel>
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 10,
						color: "var(--ink-5)",
					}}
				>
					{rows.length === total
						? `${total} en total`
						: `${rows.length} de ${total}`}
				</span>
			</div>

			<div style={{ border: "1px solid var(--border-1)" }}>
				{rows.map((item) => {
					const range = effectiveRange(item);
					const epicId = epicIdOf(item, byId);
					const epic = epicId !== null ? byId.get(epicId) : undefined;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onOpen(item)}
							style={{
								display: "grid",
								gridTemplateColumns: showProject
									? "70px 1fr 120px 150px 110px 150px 70px"
									: "70px 1fr 150px 110px 150px 70px",
								gap: 10,
								alignItems: "center",
								width: "100%",
								textAlign: "left",
								background: "none",
								border: "none",
								borderBottom: "1px solid var(--border-1)",
								padding: "9px 14px",
								cursor: "pointer",
							}}
						>
							<KeyChip id={item.key} muted={item.status === "done"} />
							<span
								style={{
									fontSize: 13,
									color:
										item.status === "done" ? "var(--ink-5)" : "var(--ink-1)",
									textDecoration:
										item.status === "done" ? "line-through" : "none",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{item.type === "subtask" ? "↳ " : ""}
								{item.title}
							</span>
							{showProject && (
								<span style={{ ...cell, color: "var(--ink-4)" }}>
									{projectsById.get(item.project_id)?.name ?? "—"}
								</span>
							)}
							<span style={{ ...cell, color: "var(--ink-4)" }}>
								{epic ? epic.key : "— sin épica —"}
							</span>
							<StatusBadge status={item.status} />
							<span style={cell}>
								{range
									? formatDateRange(item.start_date, item.end_date)
									: "// sin planificar"}
							</span>
							<span style={{ ...cell, textAlign: "right" }}>
								{item.estimate_min !== null
									? formatEstimate(item.estimate_min)
									: ""}
							</span>
						</button>
					);
				})}
				{rows.length === 0 && (
					<div
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 11,
							color: "var(--ink-5)",
							padding: "18px 14px",
						}}
					>
						{total === 0
							? showProject
								? "// aún no hay tareas en ningún proyecto"
								: "// este proyecto aún no tiene tareas"
							: "// ninguna tarea pasa los filtros"}
					</div>
				)}
			</div>
		</div>
	);
}
