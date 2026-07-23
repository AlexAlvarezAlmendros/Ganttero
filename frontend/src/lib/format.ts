const MONTHS = [
	"ENE",
	"FEB",
	"MAR",
	"ABR",
	"MAY",
	"JUN",
	"JUL",
	"AGO",
	"SEP",
	"OCT",
	"NOV",
	"DIC",
] as const;

/** "2026-07-23" → "23 JUL" (las fechas de ítem son días ISO, sin hora). */
export function formatDay(isoDay: string): string {
	const [, month, day] = isoDay.split("-");
	const index = Number(month) - 1;
	return `${Number(day)} ${MONTHS[index] ?? "?"}`;
}

export function formatDateRange(
	start: string | null,
	end: string | null,
): string | undefined {
	if (start && end) return `${formatDay(start)} → ${formatDay(end)}`;
	if (start) return `desde ${formatDay(start)}`;
	if (end) return `hasta ${formatDay(end)}`;
	return undefined;
}

/** 5400 → "1h 30m" · 90 → "0h 02m" (redondeo al minuto, como el kit). */
export function formatDuration(totalSec: number): string {
	const minutes = Math.round(totalSec / 60);
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

/** 240 → "4h" · 90 → "1h 30m" · 45 → "45m" (estimaciones). */
export function formatEstimate(estimateMin: number): string {
	const hours = Math.floor(estimateMin / 60);
	const rest = estimateMin % 60;
	if (hours === 0) return `${rest}m`;
	if (rest === 0) return `${hours}h`;
	return `${hours}h ${rest}m`;
}
