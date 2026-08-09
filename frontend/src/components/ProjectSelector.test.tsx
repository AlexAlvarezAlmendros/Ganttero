import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../api/types.js";
import { ProjectSelector } from "./ProjectSelector.js";

const projects: Project[] = [
	{
		id: 1,
		name: "Ganttero",
		key_prefix: "GP",
		description: null,
		created_at: "2026-08-01T00:00:00.000Z",
		archived_at: null,
	},
	{
		id: 2,
		name: "Otro",
		key_prefix: "OT",
		description: null,
		created_at: "2026-08-01T00:00:00.000Z",
		archived_at: null,
	},
];

function renderSelector(
	scope: number | "all" | null,
	onSelect = vi.fn(),
): ReturnType<typeof vi.fn> {
	const active =
		scope === "all" || scope === null
			? null
			: (projects.find((project) => project.id === scope) ?? null);
	render(
		<ProjectSelector
			projects={projects}
			active={active}
			scope={scope}
			onSelect={onSelect}
			onNew={vi.fn()}
			onEdit={vi.fn()}
			onDelete={vi.fn()}
		/>,
	);
	return onSelect;
}

function openMenu() {
	fireEvent.click(screen.getByRole("button", { name: /PROYECTO/ }));
}

describe("ProjectSelector — todos los proyectos", () => {
	afterEach(cleanup);

	it("ofrece TODOS LOS PROYECTOS junto a los proyectos", () => {
		renderSelector(1);
		openMenu();
		expect(screen.getByText("TODOS LOS PROYECTOS")).toBeDefined();
		// "Ganttero" sale dos veces: en el botón (ámbito activo) y en la lista.
		expect(screen.getAllByText("Ganttero").length).toBe(2);
		expect(screen.getByText("Otro")).toBeDefined();
	});

	it('al elegirlo emite el ámbito "all"', () => {
		const onSelect = renderSelector(1);
		openMenu();
		fireEvent.click(screen.getByText("TODOS LOS PROYECTOS"));
		expect(onSelect).toHaveBeenCalledWith("all");
	});

	it("al elegir un proyecto emite su id", () => {
		const onSelect = renderSelector("all");
		openMenu();
		fireEvent.click(screen.getByText("Otro"));
		expect(onSelect).toHaveBeenCalledWith(2);
	});

	it("el botón muestra el ámbito activo", () => {
		renderSelector("all");
		expect(
			screen.getByRole("button", { name: /TODOS LOS PROYECTOS/ }),
		).toBeDefined();
		cleanup();
		renderSelector(2);
		expect(screen.getByRole("button", { name: /Otro/ })).toBeDefined();
	});
});
