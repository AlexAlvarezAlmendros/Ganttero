import { useEffect, useRef, useState } from "react";
import { useVoiceCapture } from "../api/voice.js";
import type { VoiceCaptured } from "../api/voice.js";
import { Button } from "./ds/Button.js";
import { Dialog } from "./ds/Dialog.js";
import { Toast } from "./ds/Toast.js";

type Phase = "idle" | "rec" | "processing";

/**
 * Captura por voz (flujo 5.1 de functional.md): ● grabar → soltar →
 * transcribir+estructurar en el backend → el padre abre el formulario
 * pre-relleno. Cualquier fallo degrada a formulario manual SIN bloquear.
 */
export function VoiceCapture({
	onClose,
	onCaptured,
	onFallback,
}: {
	onClose: () => void;
	onCaptured: (captured: VoiceCaptured) => void;
	onFallback: (reason: string) => void;
}) {
	const [phase, setPhase] = useState<Phase>("idle");
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const capture = useVoiceCapture();

	useEffect(() => {
		return () => {
			const recorder = recorderRef.current;
			if (recorder && recorder.state !== "inactive") recorder.stop();
			for (const track of recorderRef.current?.stream.getTracks() ?? []) {
				track.stop();
			}
		};
	}, []);

	const start = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);
			chunksRef.current = [];
			recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
			recorder.onstop = () => {
				for (const track of stream.getTracks()) track.stop();
				const blob = new Blob(chunksRef.current, {
					type: recorder.mimeType || "audio/webm",
				});
				setPhase("processing");
				capture.mutate(blob, {
					onSuccess: onCaptured,
					onError: (error) => onFallback(error.message),
				});
			};
			recorderRef.current = recorder;
			recorder.start();
			setPhase("rec");
		} catch {
			onFallback("micrófono no disponible — formulario manual");
		}
	};

	const stop = () => recorderRef.current?.stop();

	return (
		<Dialog
			open
			title="Captura por voz"
			onClose={onClose}
			footer={
				<Button variant="text" size="sm" onClick={() => onFallback("")}>
					PREFIERO TECLEAR →
				</Button>
			}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 16,
					padding: "18px 0",
				}}
			>
				{phase === "processing" ? (
					<Toast>whisper + gemma están estructurando la tarea…</Toast>
				) : (
					<>
						<button
							type="button"
							onClick={phase === "rec" ? stop : start}
							style={{
								width: 74,
								height: 74,
								border:
									phase === "rec"
										? "1px solid var(--sig-late)"
										: "1px solid var(--border-2)",
								background: "var(--bg-1)",
								cursor: "var(--cur-pointer)",
								fontSize: 26,
								color: phase === "rec" ? "var(--sig-late)" : "var(--accent)",
								fontFamily: "var(--font-mono)",
								animation: phase === "rec" ? "blink 1.1s infinite" : "none",
							}}
						>
							●
						</button>
						<span
							style={{
								fontFamily: "var(--font-mono)",
								fontSize: 10,
								color: "var(--ink-5)",
							}}
						>
							{phase === "rec"
								? "// grabando… pulsa de nuevo para transcribir"
								: "// pulsa y describe la tarea — 10 segundos bastan"}
						</span>
					</>
				)}
			</div>
		</Dialog>
	);
}
