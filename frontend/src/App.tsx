import { useEffect, useMemo, useState } from "react";
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router";
import { useLogout, useSession } from "./api/auth.js";
import { useGithubLinks, useLinkRepo, useUnlinkRepo } from "./api/github.js";
import { useHealth } from "./api/health.js";
import {
	type ProjectScope,
	useCreateItem,
	useDeleteItem,
	useItems,
	useUpdateItem,
} from "./api/items.js";
import { useKanban } from "./api/kanban.js";
import {
	useCreateProject,
	useDeleteProject,
	useProjects,
	useUpdateProject,
} from "./api/projects.js";
import { useSettings } from "./api/settings.js";
import type { Item, ItemStatus, Project } from "./api/types.js";
import { BacklogView } from "./components/BacklogView.js";
import { GanttView } from "./components/GanttView.js";
import { ItemDialog } from "./components/ItemDialog.js";
import type { ItemDialogInitial } from "./components/ItemDialog.js";
import { KanbanBoard } from "./components/KanbanBoard.js";
import { AuthDisabledNotice } from "./components/LoginPage.js";
import { ProjectDelete } from "./components/ProjectDelete.js";
import { ProjectDialog } from "./components/ProjectDialog.js";
import { ProjectSelector } from "./components/ProjectSelector.js";
import { TaskDetail } from "./components/TaskDetail.js";
import { VoiceCapture } from "./components/VoiceCapture.js";
import { Button } from "./components/ds/Button.js";
import { IconButton } from "./components/ds/IconButton.js";
import { Toast } from "./components/ds/Toast.js";
import { TopBar } from "./components/ds/TopBar.js";
import { addDays, localDayIso } from "./lib/gantt.js";
import { AjustesPage } from "./pages/AjustesPage.js";

const NAV = [
	{ id: "kanban", label: "KANBAN" },
	{ id: "gantt", label: "GANTT" },
	{ id: "backlog", label: "BACKLOG" },
	{ id: "ajustes", label: "AJUSTES" },
];

const TITLES: Record<string, string> = {
	kanban: "KANBAN",
	gantt: "GANTT",
	backlog: "BACKLOG",
	ajustes: "AJUSTES",
};

export function App() {
	const navigate = useNavigate();
	const location = useLocation();
	const view = location.pathname.replace("/", "") || "kanban";
	// "Hoy" LOCAL, en estado: una pestaña que vive días debe cruzar la
	// medianoche sola (hallazgo de la verificación adversaria de la Fase 4).
	const [today, setToday] = useState(() => localDayIso(new Date()));
	useEffect(() => {
		const tick = () =>
			setToday((current) => {
				const next = localDayIso(new Date());
				return next === current ? current : next;
			});
		const timer = setInterval(tick, 60_000);
		window.addEventListener("focus", tick);
		return () => {
			clearInterval(timer);
			window.removeEventListener("focus", tick);
		};
	}, []);

	const [toast, setToast] = useState<string | null>(null);
	const [authWarningSeen, setAuthWarningSeen] = useState(false);
	// Ámbito activo: un proyecto concreto o "all" (todos a la vez).
	const [scope, setScope] = useState<ProjectScope | null>(null);
	const [projectEdit, setProjectEdit] = useState<Project | null | "new">(null);
	const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
	const [openTask, setOpenTask] = useState<Item | null>(null);
	const [creatingItem, setCreatingItem] = useState(false);
	const [capturingVoice, setCapturingVoice] = useState(false);
	const [voicePrefill, setVoicePrefill] = useState<{
		initial: ItemDialogInitial;
		hint: string;
	} | null>(null);
	// Fuerza el remontado de ItemDialog cuando la voz rellena un formulario ya
	// abierto (los campos leen `initial` solo al montar).
	const [captureNonce, setCaptureNonce] = useState(0);

	const health = useHealth();
	const session = useSession();
	const logout = useLogout();
	const projects = useProjects();
	const allProjects = scope === "all";
	/** Proyecto concreto en foco; `null` en la vista de todos los proyectos. */
	const active = useMemo(() => {
		const list = projects.data ?? [];
		if (scope === "all") return null;
		return list.find((project) => project.id === scope) ?? list[0] ?? null;
	}, [projects.data, scope]);
	const dataScope: ProjectScope | null = allProjects
		? "all"
		: (active?.id ?? null);
	const items = useItems(dataScope);
	const kanban = useKanban(dataScope);
	const settings = useSettings();
	// GitHub se enlaza a UN proyecto: en la vista de todos no aplica.
	const githubLinks = useGithubLinks(active?.id ?? null);
	const linkRepo = useLinkRepo();
	const unlinkRepo = useUnlinkRepo();
	const activeRepo = githubLinks.data?.[0];

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

	// El botón "+ NUEVA TAREA" abre el formulario manual directamente; la voz
	// pasa a ser un botón dentro del propio formulario.
	const openCreate = () => {
		if (!active && !allProjects) return;
		setVoicePrefill(null);
		setCreatingItem(true);
	};

	// Atajo de captura rápida por voz (icono del TopBar): abre la grabación;
	// al terminar, el formulario se abre pre-relleno.
	const openVoice = () => {
		if (!active && !allProjects) return;
		setCapturingVoice(true);
	};

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
					<>
						<IconButton label="Capturar por voz" onClick={openVoice}>
							●
						</IconButton>
						{session.data?.auth_enabled && (
							<IconButton
								label={`Salir${session.data.username ? ` (${session.data.username})` : ""}`}
								onClick={() => logout.mutate()}
							>
								⏻
							</IconButton>
						)}
					</>
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
						scope={scope}
						onSelect={setScope}
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
						VENTANA: HOY + {settings.data?.kanban_window_days ?? 14}D
						{activeRepo ? ` · ${activeRepo.repo_full_name} ↗` : ""}
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					disabled={!active && !allProjects}
					onClick={openCreate}
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
								board={kanban.data}
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
								{...(allProjects ? { projects: projects.data ?? [] } : {})}
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
					<Route
						path="/backlog"
						element={
							<BacklogView
								items={items.data ?? []}
								projects={projects.data ?? []}
								showProject={allProjects}
								today={today}
								windowDays={settings.data?.kanban_window_days ?? 14}
								onOpen={setOpenTask}
							/>
						}
					/>
					<Route path="/ajustes" element={<AjustesPage onSaved={setToast} />} />
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
					items={items.data ?? []}
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
			{creatingItem && (active || allProjects) && (
				<ItemDialog
					key={captureNonce}
					projectId={active?.id ?? null}
					projects={projects.data ?? []}
					items={items.data ?? []}
					onRecordVoice={() => setCapturingVoice(true)}
					{...(voicePrefill
						? { initial: voicePrefill.initial, hint: voicePrefill.hint }
						: {})}
					onClose={() => {
						setCreatingItem(false);
						setVoicePrefill(null);
					}}
					onSave={(data) =>
						createItem.mutate(data, {
							onSuccess: (item) => {
								setToast(
									voicePrefill
										? `${item.key} creada por voz · entra donde sus fechas manden`
										: `${item.key} creada`,
								);
								setCreatingItem(false);
								setVoicePrefill(null);
							},
							onError: (error) => setToast(`error: ${error.message}`),
						})
					}
				/>
			)}
			{capturingVoice && (
				<VoiceCapture
					onClose={() => setCapturingVoice(false)}
					onCaptured={(captured) => {
						setCapturingVoice(false);
						setVoicePrefill({
							initial: {
								title: captured.item.title,
								type: captured.item.type,
								start_date: captured.item.start_date,
								end_date: captured.item.end_date,
								estimate_min: captured.item.estimate_min,
								description: captured.item.description,
							},
							hint: captured.transcript,
						});
						// Remonta el formulario abierto para que tome el pre-relleno.
						setCaptureNonce((nonce) => nonce + 1);
						setCreatingItem(true);
					}}
					onFallback={(reason) => {
						// Degrada a formulario manual: lo abre si venía del atajo del
						// TopBar, o lo deja tal cual si ya estaba abierto.
						setCapturingVoice(false);
						setCreatingItem(true);
						if (reason) setToast(reason);
					}}
				/>
			)}
			{projectEdit !== null && (
				<ProjectDialog
					project={projectEdit === "new" ? null : projectEdit}
					{...(projectEdit !== "new" &&
					projectEdit?.id === active?.id &&
					activeRepo
						? { currentRepo: activeRepo.repo_full_name }
						: {})}
					onClose={() => setProjectEdit(null)}
					onSave={(data) => {
						const syncRepo = (projectId: number) => {
							const current = projectId === active?.id ? activeRepo : undefined;
							if (current && current.repo_full_name !== data.repo) {
								unlinkRepo.mutate({ linkId: current.id, projectId });
							}
							if (data.repo && current?.repo_full_name !== data.repo) {
								linkRepo.mutate({ projectId, repo: data.repo });
							}
						};
						if (data.id !== undefined) {
							updateProject.mutate(
								{ id: data.id, name: data.name, description: data.description },
								{
									onSuccess: (saved) => {
										syncRepo(saved.id);
										setToast(`${data.name} actualizado`);
										setProjectEdit(null);
									},
									onError: (error) => setToast(`error: ${error.message}`),
								},
							);
						} else {
							createProject.mutate(data, {
								onSuccess: (project) => {
									setScope(project.id);
									syncRepo(project.id);
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
			{session.data?.auth_enabled === false && !authWarningSeen && (
				<AuthDisabledNotice onDismiss={() => setAuthWarningSeen(true)} />
			)}
			{toast && (
				<div style={{ position: "fixed", bottom: 52, right: 24, zIndex: 200 }}>
					<Toast onDismiss={() => setToast(null)}>{toast}</Toast>
				</div>
			)}
		</div>
	);
}
