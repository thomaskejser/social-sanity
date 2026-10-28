import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db, flag: Number, fromFlag: (v: number | null) => v === 1 }));

const { listUpcomingBirthdays } = await import('./birthdays.ts');
const { createHuman } = await import('./store.ts');

const human = (name: string, birthday: string) =>
	createHuman({ human: name, firstName: '', middleNames: [], familyName: '', birthday });
const on = (day: string) => new Date(`${day}T12:00:00`);

describe('listUpcomingBirthdays', () => {
	beforeEach(() => db.exec('DELETE FROM human;'));

	it('lists birthdays from today until three days on, soonest first, with the age turned', () => {
		human('Later', '1990-06-13');
		human('Today', '1980-06-10');
		human('Too late', '1990-06-14');
		human('Yesterday', '1990-06-09');
		expect(
			listUpcomingBirthdays(3, on('2026-06-10')).map((b) => [b.human, b.daysUntil, b.age])
		).toEqual([
			['Today', 0, 46],
			['Later', 3, 36]
		]);
	});

	it('crosses the new year, and turns the age with it', () => {
		human('New year', '2000-01-01');
		const [birthday] = listUpcomingBirthdays(3, on('2026-12-30'));
		expect([birthday.day, birthday.daysUntil, birthday.age]).toEqual(['2027-01-01', 2, 27]);
	});

	it('shows no age when the year is unknown or a placeholder', () => {
		human('No year', '--06-10');
		human('Placeholder', '1900-06-10');
		expect(listUpcomingBirthdays(3, on('2026-06-10')).map((b) => b.age)).toEqual([null, null]);
	});

	it('leaves out humans without a birthday', () => {
		human('Nobody', '');
		expect(listUpcomingBirthdays(3, on('2026-06-10'))).toEqual([]);
	});
});
