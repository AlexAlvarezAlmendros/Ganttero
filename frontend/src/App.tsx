import { useEffect, useMemo, useState } from "react";
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router";
import { useHealth } from "./api/health.js";
import {
	useCreateItem,
	useDeleteItem,
	useItems,
	useUpdateItem,
} from "./api/items.js";
import {
	useCreateProject,
	useDeleteProject,
	useProjects,
	useUpdateProject,
} from "./api/projects.js";
import type { Item, ItemStatus, Project } from "./api/types.js";
import { GanttView } from "./components/GanttView.js";
import { ItemDialog } from "./components/ItemDialog.js";
import { KanbanBoard } from "./components/KanbanBoard.js";
import { ProjectDelete } from "./components/ProjectDelete.js";
import { ProjectDialog } from "./components/ProjectDialog.js";
import { ProjectSelector } from "./components/ProjectSelector.js";
import { TaskDetail } from "./components/TaskDetail.js";
import { Button } from "./components/ds/Button.js";
import { IconButton } from "./components/ds/IconButton.js";
import { Toast } from "./components/ds/Toast.js";
import { TopBar } from "./components/ds/TopBar.js";
import { addDays } from "./lib/gantt.js";
import { AjustesPage } from "./pages/AjustesPage.js";

const NAV = [
	{ id: "kanban", label: "KANBAN" },
	{ id: "gantt", label: "GANTT" },
	{ id: "ajustes", label: "AJUSTES" },
];

const TITLES: Record<string, string> = {
	kanban: "KANBAN",
	gantt: "GANTT",
	ajustes: "AJUSTES",
};

export function App() {
	const navigate = useNavigate();
	const location = useLocation();
	const view = location.pathname.replace("/", "") || "kanban";
	// "hoy" se resuelve una sola vez en el borde de la UI y se inyecta hacia dentro.
	const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const [toast, setToast] = useState<string | null>(null);
	const [projectId, setProjectId] = useState<number | null>(null);
	const [projectEdit, setProjectEdit] = useState<Project | null | "new">(null);
	const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
	const [openTask, setOpenTask] = useState<Item | null>(null);
	const [creatingItem, setCreatingItem] = useState(false);

	const health = useHealth();
	const projects = useProjects();
	const active = useMemo(() => {
		const list = projects.data ?? [];
		return list.find((project) => project.id === projectId) ?? list[0] ?? null;
	}, [projects.data, projectId]);
	const items = useItems(active?.id ?? null);

	const createProject = useCreateProject();
	const updateProject = useUpdateProject();
	const deleteProject = useDeleteProject();
	const createItem = useCreateItem();
	const updateItem = useUpdateItem();
	const deleteItem = useDeleteItem();

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 3500);
		return () => clearTimeout(timer);
	}, [toast]);

	const voicePending = () =>
		setToast(
			"captura por voz — llega en la fase 5 (el pipeline ya está validado)",
		);

	const handleStatus = (item: Item, status: ItemStatus) => {
		updateItem.mutate(
			{ id: item.id, status },
			{
				onSuccess: () => {
					if (status === "done")
						setToast(`${item.key} → hecha · time_log cerrado`);
					else if (status === "in_progress")
						setToast(`${item.key} → en curso · tramo abierto`);
					setOpenTask((current) =>
						current && current.id === item.id
							? { ...current, status }
							: current,
					);
				},
				onError: (error) => setToast(`error: ${error.message}`),
			},
		);
	};

	return (
		<div
			style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
		>
			<TopBar
				nav={NAV}
				active={view}
				onNav={(id) => navigate(`/${id}`)}
				right={
					<IconButton label="Capturar por voz" onClick={voicePending}>
						●
					</IconButton>
				}
			/>
			<div
				style={{
					padding: "20px 24px 10px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "baseline",
					fontFamily: "var(--font-mono)",
				}}
			>
				<div style={{ display: "flex", gap: 20, alignItems: "center" }}>
					<span
						style={{
							fontFamily: "var(--font-display)",
							fontWeight: 800,
							fontSize: 28,
							letterSpacing: "-.02em",
						}}
					>
						{TITLES[view] ?? "KANBAN"}
					</span>
					<ProjectSelector
						projects={projects.data ?? []}
						active={active}
						onSelect={setProjectId}
						onNew={() => setProjectEdit("new")}
						onEdit={setProjectEdit}
						onDelete={setProjectToDelete}
					/>
					<span
						style={{
							fontSize: 10,
							color: "var(--ink-5)",
							letterSpacing: ".06em",
						}}
					>
						VENTANA: HOY + 14D
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					disabled={!active}
					onClick={() => setCreatingItem(true)}
				>
					+ NUEVA TAREA
				</Button>
			</div>
			<main style={{ padding: "10px 24px 30px", flex: 1 }}>
				<Routes>
					<Route path="/" element={<Navigate to="/kanban" replace />} />
					<Route
						path="/kanban"
						element={
							<KanbanBoard
								items={items.data ?? []}
								onOpen={setOpenTask}
								onStatusChange={handleStatus}
							/>
						}
					/>
					<Route
						path="/gantt"
						element={
							<GanttView
								items={items.data ?? []}
								today={today}
								onOpen={setOpenTask}
								onMove={(item, days) =>
									updateItem.mutate(
										{
											id: item.id,
											start_date: item.start_date
												? addDays(item.start_date, days)
												: null,
											end_date: item.end_date
												? addDays(item.end_date, days)
												: null,
										},
										{
											onSuccess: (moved) =>
												setToast(
													`${moved.key} → ${moved.start_date} · el kanban se derivará solo`,
												),
											onError: (error) => setToast(`error: ${error.message}`),
										},
									)
								}
							/>
						}
					/>
					<Route path="/ajustes" element={<AjustesPage />} />
				</Routes>
			</main>
			<footer
				style={{
					display: "flex",
					justifyContent: "space-between",
					padding: "12px 24px",
					borderTop: "1px solid var(--border-1)",
					fontFamily: "var(--font-mono)",
					fontSize: 10,
					color: "var(--ink-5)",
				}}
			>
				<span>
					// self-hosted · datos en el NAS · único punto en la nube: github
				</span>
				<span>
					api:{" "}
					<span
						style={{
							color: health.isSuccess ? "var(--accent)" : "var(--sig-late)",
						}}
					>
						{health.isSuccess ? "ok" : health.isPending ? "…" : "off"}
					</span>
				</span>
			</footer>

			{openTask && (
				<TaskDetail
					task={openTask}
					onClose={() => setOpenTask(null)}
					onStatus={handleStatus}
					onSave={(item, patch) =>
						updateItem.mutate(
							{ id: item.id, ...patch },
							{
								onSuccess: () => {
									setToast(`${item.key} guardada`);
									setOpenTask(null);
								},
								onError: (error) => setToast(`error: ${error.message}`),
							},
						)
					}
					onDelete={(item) =>
						deleteItem.mutate(
							{ id: item.id, project_id: item.project_id },
							{
								onSuccess: () => {
									setToast(`${item.key} eliminada`);
									setOpenTask(null);
								},
							},
						)
					}
				/>
			)}
			{creatingItem && active && (
				<ItemDialog
					projectId={active.id}
					items={items.data ?? []}
					onClose={() => setCreatingItem(false)}
					onSave={(data) =>
						createItem.mutate(data, {
							onSuccess: (item) => {
								setToast(`${item.key} creada`);
								setCreatingItem(false);
							},
							onError: (error) => setToast(`error: ${error.message}`),
						})
					}
				/>
			)}
			{projectEdit !== null && (
				<ProjectDialog
					project={projectEdit === "new" ? null : projectEdit}
					onClose={() => setProjectEdit(null)}
					onSave={(data) => {
						if (data.id !== undefined) {
							updateProject.mutate(
								{ id: data.id, name: data.name, description: data.description },
								{
									onSuccess: () => {
										setToast(`${data.name} actualizado`);
										setProjectEdit(null);
									},
									onError: (error) => setToast(`error: ${error.message}`),
								},
							);
						} else {
							createProject.mutate(data, {
								onSuccess: (project) => {
									setProjectId(project.id);
									setToast(`${project.name} creado · planifica en el gantt`);
									setProjectEdit(null);
								},
								onError: (error) => setToast(`error: ${error.message}`),
							});
						}
					}}
				/>
			)}
			{projectToDelete && (
				<ProjectDelete
					project={projectToDelete}
					itemCount={
						projectToDelete.id === active?.id
							? (items.data?.length ?? null)
							: null
					}
					onClose={() => setProjectToDelete(null)}
					onConfirm={() =>
						deleteProject.mutate(projectToDelete.id, {
							onSuccess: () => {
								setToast(`${projectToDelete.name} eliminado`);
								setProjectToDelete(null);
							},
						})
					}
				/>
			)}
			{toast && (
				<div style={{ position: "fixed", bottom: 52, right: 24, zIndex: 200 }}>
					<Toast onDismiss={() => setToast(null)}>{toast}</Toast>
				</div>
			)}
		</div>
	);
}
