import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog.js";

function renderDialog(onClose = vi.fn()) {
	render(
		<Dialog open title="Nueva tarea" onClose={onClose}>
			<input aria-label="Título" />
		</Dialog>,
	);
	return onClose;
}

describe("Dialog", () => {
	afterEach(cleanup);

	it("no se cierra al hacer clic fuera (en el scrim)", () => {
		const onClose = renderDialog();
		const scrim = document.querySelector(".gtr-dialog__scrim");
		expect(scrim).not.toBeNull();
		fireEvent.click(scrim as Element);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("tampoco se cierra al hacer clic dentro", () => {
		const onClose = renderDialog();
		fireEvent.click(screen.getByLabelText("Título"));
		expect(onClose).not.toHaveBeenCalled();
	});

	it("se cierra con la ✕", () => {
		const onClose = renderDialog();
		fireEvent.click(screen.getByRole("button", { name: "✕" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("se cierra con Escape desde dentro del formulario", () => {
		const onClose = renderDialog();
		fireEvent.keyDown(screen.getByLabelText("Título"), { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("no renderiza nada si open es false", () => {
		render(
			<Dialog open={false} title="Oculto" onClose={vi.fn()}>
				<span>contenido</span>
			</Dialog>,
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
