import { describe, expect, it } from "vitest";
import {
	formatDateRange,
	formatDay,
	formatDuration,
	formatEstimate,
} from "./format.js";

describe("formatDay / formatDateRange", () => {
	it("convierte días ISO al formato del kit", () => {
		expect(formatDay("2026-07-23")).toBe("23 JUL");
		expect(formatDay("2026-01-05")).toBe("5 ENE");
	});

	it("compone rangos y extremos sueltos", () => {
		expect(formatDateRange("2026-07-23", "2026-07-25")).toBe("23 JUL → 25 JUL");
		expect(formatDateRange("2026-07-23", null)).toBe("desde 23 JUL");
		expect(formatDateRange(null, "2026-07-25")).toBe("hasta 25 JUL");
		expect(formatDateRange(null, null)).toBeUndefined();
	});
});

describe("formatDuration", () => {
	it("redondea al minuto con el formato del kit", () => {
		expect(formatDuration(5400)).toBe("1h 30m");
		expect(formatDuration(90)).toBe("0h 02m");
		expect(formatDuration(0)).toBe("0h 00m");
	});
});

describe("formatEstimate", () => {
	it("elige la forma más corta", () => {
		expect(formatEstimate(240)).toBe("4h");
		expect(formatEstimate(90)).toBe("1h 30m");
		expect(formatEstimate(45)).toBe("45m");
	});
});
