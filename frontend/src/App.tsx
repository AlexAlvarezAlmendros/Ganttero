import { useEffect, useState } from "react";
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router";
import { useHealth } from "./api/health.js";
import { Button } from "./components/ds/Button.js";
import { IconButton } from "./components/ds/IconButton.js";
import { Toast } from "./components/ds/Toast.js";
import { TopBar } from "./components/ds/TopBar.js";
import { AjustesPage } from "./pages/AjustesPage.js";
import { GanttPage } from "./pages/GanttPage.js";
import { KanbanPage } from "./pages/KanbanPage.js";

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
	const [toast, setToast] = useState<string | null>(null);
	const health = useHealth();

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 3500);
		return () => clearTimeout(timer);
	}, [toast]);

	const voicePending = () =>
		setToast(
			"captura por voz — llega en la fase 5 (el pipeline ya está validado)",
		);

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
				<Button variant="ghost" size="sm" onClick={voicePending}>
					+ NUEVA TAREA (VOZ)
				</Button>
			</div>
			<main style={{ padding: "10px 24px 30px", flex: 1 }}>
				<Routes>
					<Route path="/" element={<Navigate to="/kanban" replace />} />
					<Route path="/kanban" element={<KanbanPage />} />
					<Route path="/gantt" element={<GanttPage />} />
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
			{toast && (
				<div style={{ position: "fixed", bottom: 52, right: 24, zIndex: 200 }}>
					<Toast onDismiss={() => setToast(null)}>{toast}</Toast>
				</div>
			)}
		</div>
	);
}
