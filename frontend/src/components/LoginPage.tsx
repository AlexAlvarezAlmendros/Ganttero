import { type FormEvent, useState } from "react";
import { useLogin } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import { Button } from "./ds/Button.js";
import { MicroLabel } from "./ds/MicroLabel.js";
import "./ds/ds.css";

/**
 * Pantalla de entrada. Formulario nativo (`<form>` + `autoComplete`) para que
 * los gestores de contraseñas funcionen y el Enter envíe. El mensaje de error
 * es siempre el que devuelve el backend: nunca dice qué campo ha fallado.
 */
export function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const login = useLogin();

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (login.isPending) return;
		login.mutate({ username, password });
	};

	const error = login.error;
	const blocked = error instanceof ApiError && error.status === 429;

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 24,
			}}
		>
			<form
				onSubmit={handleSubmit}
				style={{
					width: "min(380px, 100%)",
					border: "1px solid var(--border-2)",
					padding: "28px 26px 24px",
					display: "flex",
					flexDirection: "column",
					gap: 18,
				}}
			>
				<div>
					<div
						style={{
							fontFamily: "var(--font-display)",
							fontWeight: 800,
							fontSize: 28,
							letterSpacing: "-.02em",
						}}
					>
						GANTTERO<span style={{ color: "var(--accent)" }}>™</span>
					</div>
					<MicroLabel style={{ marginTop: 6 }}>
						acceso privado · self-hosted
					</MicroLabel>
				</div>

				<label className="gtr-field">
					<span className="gtr-field__label">USUARIO</span>
					<input
						className="gtr-input"
						name="username"
						autoComplete="username"
						// biome-ignore lint/a11y/noAutofocus: única acción de la pantalla
						autoFocus
						value={username}
						disabled={login.isPending}
						onChange={(event) => setUsername(event.target.value)}
					/>
				</label>

				<label className="gtr-field">
					<span className="gtr-field__label">CONTRASEÑA</span>
					<input
						className="gtr-input"
						type="password"
						name="password"
						autoComplete="current-password"
						value={password}
						disabled={login.isPending}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</label>

				{error && (
					<div
						role="alert"
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 11,
							color: blocked ? "var(--sig-blocked)" : "var(--sig-late)",
						}}
					>
						{"// "}
						{error.message}
					</div>
				)}

				<button
					type="submit"
					className="gtr-btn gtr-btn--primary"
					disabled={
						login.isPending || username.length === 0 || password.length === 0
					}
					style={{
						padding: "var(--pad-btn)",
						fontSize: "12.5px",
						justifyContent: "center",
					}}
				>
					{login.isPending ? "ENTRANDO…" : "ENTRAR"}
				</button>

				<MicroLabel>
					{"// la sesión se guarda en una cookie httponly del navegador"}
				</MicroLabel>
			</form>
		</div>
	);
}

/** Aviso del backend arrancado sin credenciales: la API está abierta. */
export function AuthDisabledNotice({ onDismiss }: { onDismiss: () => void }) {
	return (
		<div
			style={{
				position: "fixed",
				bottom: 52,
				left: 24,
				zIndex: 200,
				border: "1px solid var(--sig-late)",
				padding: "10px 12px",
				fontFamily: "var(--font-mono)",
				fontSize: 10,
				color: "var(--sig-late)",
				background: "var(--surface-card)",
				display: "flex",
				gap: 12,
				alignItems: "center",
			}}
		>
			<span>{"// AUTENTICACIÓN DESACTIVADA EN EL BACKEND"}</span>
			<Button variant="text" size="sm" onClick={onDismiss}>
				OK
			</Button>
		</div>
	);
}
