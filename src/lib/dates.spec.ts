import { describe, expect, it } from 'vitest';
import { dayParts, daysInMonth, formatDayParts, monthGrid } from './dates.ts';

describe('monthGrid', () => {
	it('starts weeks on Monday and pads with nulls', () => {
		const weeks = monthGrid(2026, 10);
		expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
		expect(weeks.at(-1)).toEqual([26, 27, 28, 29, 30, 31, null]);
		expect(weeks.every((w) => w.length === 7)).toBe(true);
	});

	it('knows leap years', () => {
		expect(daysInMonth(2000, 2)).toBe(29);
		expect(daysInMonth(2026, 2)).toBe(28);
		expect(monthGrid(2000, 2).flat().filter(Boolean)).toHaveLength(29);
	});
});

describe('dayParts', () => {
	it('round-trips full and year-less days', () => {
		expect(dayParts('1980-05-17')).toEqual({ year: 1980, month: 5, day: 17 });
		expect(dayParts('--05-17')).toEqual({ year: null, month: 5, day: 17 });
		expect(formatDayParts({ year: 1980, month: 5, day: 7 })).toBe('1980-05-07');
		expect(formatDayParts({ year: null, month: 12, day: 1 })).toBe('--12-01');
	});

	it('rejects other text', () => {
		expect(dayParts('17/05/1980')).toBeUndefined();
		expect(dayParts('')).toBeUndefined();
	});
});
