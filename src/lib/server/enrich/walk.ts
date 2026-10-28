import { db } from '../db/index.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import nextHumanSql from './sql/next-human.sql?raw';
import nextCompanySql from './sql/next-company.sql?raw';
import nextChannelSql from './sql/next-channel.sql?raw';
import markHumanSql from './sql/mark-human.sql?raw';
import markCompanySql from './sql/mark-company.sql?raw';
import markChannelSql from './sql/mark-channel.sql?raw';
import enrichedAtSql from './sql/enriched-at.sql?raw';

export type EnrichCandidate = {
	id: number;
	name: string;
	/** What the record lacks, e.g. "birthday". */
	missing: string[];
	/** How many records are left to look up, this one included. */
	remaining: number;
};

type NextRow = {
	id: number;
	name: string;
	noName: number;
	noBirthday: number;
	noAddress: number;
	noPhone: number;
	noSocial: number;
	noSource: number;
	noPicture: number;
	remaining: number;
};

const prepareNext = (sql: string) => db.prepare<[{ after: number }], NextRow>(sql);
const prepareMark = (sql: string) => db.prepare<[{ id: number; now: number }]>(sql);

const statements = {
	next: {
		human: prepareNext(nextHumanSql),
		company: prepareNext(nextCompanySql),
		channel: prepareNext(nextChannelSql)
	},
	mark: {
		human: prepareMark(markHumanSql),
		company: prepareMark(markCompanySql),
		channel: prepareMark(markChannelSql)
	},
	enrichedAt: db.prepare<[{ kind: MemberKind; id: number }], { enrichedAt: number | null }>(
		enrichedAtSql
	)
};

/**
 * The next record of `kind`, in ID order after `after`, that Claude has not looked up yet and that
 * lacks something Claude could find.
 */
export function nextToEnrich(kind: MemberKind, after: number): EnrichCandidate | undefined {
	const row = statements.next[kind].get({ after });
	if (!row) return undefined;
	const missing = [
		row.noName && 'name',
		row.noBirthday && 'birthday',
		row.noAddress && 'address',
		row.noPhone && 'phone number',
		row.noSocial && 'social media',
		row.noSource && 'content sources',
		row.noPicture && 'picture'
	].filter((item): item is string => !!item);
	return { id: row.id, name: row.name, missing, remaining: row.remaining };
}

/** Records that Claude has looked the record up, so the walk passes it by from now on. */
export function markEnriched(kind: MemberKind, id: number, now = Date.now()) {
	statements.mark[kind].run({ id, now });
}

/** When Claude last looked the record up, in epoch milliseconds; null when it never has. */
export function enrichedAt(kind: MemberKind, id: number): number | null {
	return statements.enrichedAt.get({ kind, id })?.enrichedAt ?? null;
}
