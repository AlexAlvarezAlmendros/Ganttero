import { useSettings, useUpdateSettings } from "../api/settings.js";
import { MicroLabel } from "../components/ds/MicroLabel.js";
import { Select } from "../components/ds/Select.js";
import { Switch } from "../components/ds/Switch.js";

export function AjustesPage({
	onSaved,
}: { onSaved: (message: string) => void }) {
	const settings = useSettings();
	const updateSettings = useUpdateSettings();

	return (
		<div
			style={{
				maxWidth: 560,
				display: "flex",
				flexDirection: "column",
				gap: 22,
			}}
		>
			<div
				style={{
					border: "1px solid var(--border-1)",
					padding: 18,
					display: "flex",
					flexDirection: "column",
					gap: 14,
				}}
			>
				<MicroLabel>VENTANA DEL KANBAN</MicroLabel>
				<Select
					value={String(settings.data?.kanban_window_days ?? 14)}
					onChange={(value) =>
						updateSettings.mutate(
							{ kanban_window_days: Number(value) },
							{
								onSuccess: (saved) =>
									onSaved(
										`ventana → ${saved.kanban_window_days} días · el kanban se rederiva`,
									),
							},
						)
					}
					options={[
						{ value: "7", label: "7 DÍAS" },
						{ value: "14", label: "14 DÍAS" },
						{ value: "21", label: "21 DÍAS" },
						{ value: "30", label: "30 DÍAS" },
					]}
				/>
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 10,
						color: "var(--ink-5)",
					}}
				>
					// un ítem entra si sus fechas cruzan [hoy, hoy + ventana]; las
					vencidas no salen nunca
				</span>
			</div>
			<div
				style={{
					border: "1px solid var(--border-1)",
					padding: 18,
					display: "flex",
					flexDirection: "column",
					gap: 14,
				}}
			>
				<MicroLabel>VOZ</MicroLabel>
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 10,
						color: "var(--ink-5)",
					}}
				>
					// retención de audios y captura — fase 5
				</span>
			</div>
			<div
				style={{
					border: "1px solid var(--border-1)",
					padding: 18,
					display: "flex",
					flexDirection: "column",
					gap: 14,
				}}
			>
				<MicroLabel>GITHUB</MicroLabel>
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 10,
						color: "var(--ink-5)",
					}}
				>
					// token con scope mínimo y smart commits — fase 6
				</span>
			</div>
		</div>
	);
}
