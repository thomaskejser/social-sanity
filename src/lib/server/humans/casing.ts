import { db } from '../db/index.ts';
import { titleCaseName } from '#lib/humans/casing.ts';
import { namesVersion, updateHuman, type HumanNames } from './store.ts';
import listNamesSql from './sql/list-human-names.sql?raw';

const listNames = db.prepare<
	[],
	{
		humanId: number;
		human: string;
		firstName: string;
		familyName: string;
		birthday: string;
		middleNames: string;
	}
>(listNamesSql);

/** The humans whose display, first, middle or family names title-casing would change. */
function casingFixes(): { humanId: number; names: HumanNames }[] {
	const fixes = [];
	for (const row of listNames.all()) {
		const middle = JSON.parse(row.middleNames) as string[];
		const names = {
			human: titleCaseName(row.human),
			firstName: titleCaseName(row.firstName),
			middleNames: middle.map((name) => titleCaseName(name)),
			familyName: titleCaseName(row.familyName, { family: true }),
			birthday: row.birthday
		};
		const same =
			names.human === row.human &&
			names.firstName === row.firstName &&
			names.familyName === row.familyName &&
			names.middleNames.every((name, i) => name === middle[i]);
		if (!same) fixes.push({ humanId: row.humanId, names });
	}
	return fixes;
}

let cached: { version: number; count: number } | null = null;

/** How many humans Fix casing would change; worked out again only after names change. */
export function countCasingFixes(): number {
	if (cached?.version !== namesVersion())
		cached = { version: namesVersion(), count: casingFixes().length };
	return cached.count;
}

/** Title-cases every human's names; returns how many changed. */
export const fixCasing = db.transaction((): number => {
	const fixes = casingFixes();
	for (const fix of fixes) updateHuman(fix.humanId, fix.names);
	return fixes.length;
});
