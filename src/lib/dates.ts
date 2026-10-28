/** A leap year, so a calendar without a year still offers 29 February. */
export const YEARLESS = 2000;

export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The weeks of a month for a calendar grid, Monday first. `null` pads the days before the 1st and
 * after the last day. `month` is 1-12.
 */
export function monthGrid(year: number, month: number): (number | null)[][] {
	const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
	const cells: (number | null)[] = [
		...Array<null>(firstWeekday).fill(null),
		...Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1)
	];
	while (cells.length % 7) cells.push(null);
	const weeks: (number | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

export type DayParts = { year: number | null; month: number; day: number };

/** Splits `YYYY-MM-DD` or `--MM-DD`; undefined for anything else. */
export function dayParts(value: string): DayParts | undefined {
	const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (full) return { year: Number(full[1]), month: Number(full[2]), day: Number(full[3]) };
	const yearless = /^--(\d{2})-(\d{2})$/.exec(value);
	if (yearless) return { year: null, month: Number(yearless[1]), day: Number(yearless[2]) };
	return undefined;
}

export function formatDayParts(parts: DayParts): string {
	const mm = String(parts.month).padStart(2, '0');
	const dd = String(parts.day).padStart(2, '0');
	return parts.year === null
		? `--${mm}-${dd}`
		: `${String(parts.year).padStart(4, '0')}-${mm}-${dd}`;
}
