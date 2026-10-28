import { db } from '../db/index.ts';
import listBirthdaysSql from './sql/list-birthdays.sql?raw';

/** Ages beyond this come from placeholder years such as 1900, and are not shown. */
const MAX_AGE = 120;

export type UpcomingBirthday = {
	humanId: number;
	human: string;
	/** `YYYY-MM-DD` of the coming birthday. */
	day: string;
	/** 0 when it is today. */
	daysUntil: number;
	/** The age they turn; null when the year of birth is not known. */
	age: number | null;
	avatar: boolean;
};

const statement = db.prepare<
	[{ today: string; days: number }],
	Omit<UpcomingBirthday, 'avatar'> & { avatar: number }
>(listBirthdaysSql);

/** `YYYY-MM-DD` of a moment in the server's time zone. */
export function localDay(at: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** The birthdays from today until `days` days from now, soonest first. */
export function listUpcomingBirthdays(days: number, now = new Date()): UpcomingBirthday[] {
	return statement.all({ today: localDay(now), days }).map((row) => ({
		...row,
		age: row.age !== null && row.age >= 0 && row.age <= MAX_AGE ? row.age : null,
		avatar: row.avatar === 1
	}));
}
