import { MicroLabel } from "../components/ds/MicroLabel.js";

const SECTIONS: Array<{ label: string; note: string }> = [
	{
		label: "VENTANA DEL KANBAN",
		note: "// un ítem entra si sus fechas cruzan [hoy, hoy + ventana] — fase 4",
	},
	{ label: "VOZ", note: "// retención de audios y captura — fase 5" },
	{
		label: "GITHUB",
		note: "// token con scope mínimo y webhook/polling — fase 6",
	},
];

/** Esqueleto de ajustes: cada bloque se activa en su fase. */
export function AjustesPage() {
	return (
		<div
			style={{
				maxWidth: 560,
				display: "flex",
				flexDirection: "column",
				gap: 22,
			}}
		>
			{SECTIONS.map((section) => (
				<div
					key={section.label}
					style={{
						border: "1px solid var(--border-1)",
						padding: 18,
						display: "flex",
						flexDirection: "column",
						gap: 14,
					}}
				>
					<MicroLabel>{section.label}</MicroLabel>
					<span
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 10,
							color: "var(--ink-5)",
						}}
					>
						{section.note}
					</span>
				</div>
			))}
		</div>
	);
}
