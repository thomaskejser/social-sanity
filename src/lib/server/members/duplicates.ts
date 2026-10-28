import { db } from '../db/index.ts';
import { askClaude, type ClaudeTask } from '../claude.ts';
import { getChannel, listChannels } from '../channels/store.ts';
import { getCompany, listCompanies, listCompanyDetails } from '../companies/store.ts';
import { getHuman, listDetails, listGroups, listHumans } from '../humans/store.ts';
import { listReferences, type MemberOwner } from '../references/store.ts';
import { listSocialAccounts } from '../social-accounts.ts';
import { listSources } from '../sources/store.ts';
import { describeDay } from '#lib/humans/details.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import type { PresenceAccount } from '#lib/members/presence.ts';
import addSql from './sql/add-candidate.sql?raw';
import listPendingSql from './sql/list-pending.sql?raw';
import listDecidedSql from './sql/list-decided.sql?raw';
import setStatusSql from './sql/set-status.sql?raw';

/** Every record of a kind is sent at once, so Claude can compare each name with all others. */
const ALL = 1_000_000;

export type MergeCandidate = {
	mergeCandidateId: number;
	reason: string;
	first: MemberFacts;
	second: MemberFacts;
};

/** What the user needs to tell two records apart. */
export type MemberFacts = { kind: MemberKind; id: number; name: string; facts: string[] };

const statements = {
	add: db.prepare(addSql),
	listPending: db.prepare<
		[{ member_kind: string }],
		{ mergeCandidateId: number; firstId: number; secondId: number; reason: string }
	>(listPendingSql),
	listDecided: db.prepare<[{ member_kind: string }], { firstId: number; secondId: number }>(
		listDecidedSql
	),
	setStatus: db.prepare(setStatusSql)
};

const REFERENCE_SOURCES = {
	GOOGLE_CONTACTS: 'Google Contacts',
	YOUTUBE: 'YouTube',
	REDDIT: 'Reddit'
};

const NOUNS = { human: 'person', company: 'company', channel: 'channel' };

function members(kind: MemberKind): { id: number; name: string; accounts: PresenceAccount[] }[] {
	if (kind === 'human')
		return listHumans('', ALL, 0).map((h) => ({
			id: h.humanId,
			name: h.human,
			accounts: h.accounts
		}));
	if (kind === 'company')
		return listCompanies('', ALL, 0).map((c) => ({
			id: c.companyId,
			name: c.company,
			accounts: c.accounts
		}));
	return listChannels('', ALL, 0).map((c) => ({
		id: c.channelId,
		name: c.channel,
		accounts: c.accounts
	}));
}

const ANSWER: ClaudeTask['answer'] = {
	name: 'report_duplicates',
	description: 'Report the pairs of records that are the same.',
	schema: {
		type: 'object',
		properties: {
			pairs: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						first: { type: 'integer' },
						second: { type: 'integer' },
						reason: { type: 'string', description: 'A few words on why they are the same.' }
					},
					required: ['first', 'second', 'reason'],
					additionalProperties: false
				}
			}
		},
		required: ['pairs'],
		additionalProperties: false
	}
};

function system(kind: MemberKind): string {
	const noun = NOUNS[kind];
	return `You find duplicates in a personal list of the ${noun === 'person' ? 'people' : `${noun === 'company' ? 'companies' : 'channels'}`} the user follows.
Each record has an id, a name, and the social media profiles linked to it.
Report a pair when both records are the same ${noun}: the same name written differently (a handle such as "williamvaughn" for "William Vaughn", a nickname, a missing middle name, initials, other spelling or casing, a title or company suffix), or the same social media profile.
Two different ${noun === 'person' ? 'people' : `${noun === 'company' ? 'companies' : 'channels'}`} can share a common name; without more in common than the name, do not report them.
Only report pairs you are confident about. Report each pair once, by the two ids. Answer once, with every pair you found, or none.`;
}

/** The pairs already decided, as "first-second" keys. */
function decided(kind: MemberKind): Set<string> {
	return new Set(
		statements.listDecided.all({ member_kind: kind }).map((p) => `${p.firstId}-${p.secondId}`)
	);
}

/**
 * Asks Claude which records of a kind are the same, sending every name with its social media
 * profiles, and keeps each new pair for the user to decide. Pairs the user already decided on are
 * not suggested again. Returns how many new pairs were found.
 */
export async function findDuplicates(kind: MemberKind, now = Date.now()): Promise<number> {
	const list = members(kind);
	const ids = new Set(list.map((m) => m.id));
	const answer = (await askClaude({
		system: system(kind),
		prompt: JSON.stringify(
			list.map((m) => ({ id: m.id, name: m.name, profiles: m.accounts.map((a) => a.url) }))
		),
		answer: ANSWER,
		effort: 'medium',
		refusal: 'The AI declined to look for duplicates.'
	})) as { pairs?: { first?: unknown; second?: unknown; reason?: unknown }[] } | undefined;

	const known = decided(kind);
	let added = 0;
	for (const pair of answer?.pairs ?? []) {
		const a = Number(pair.first);
		const b = Number(pair.second);
		if (!ids.has(a) || !ids.has(b) || a === b) continue;
		const [first, second] = a < b ? [a, b] : [b, a];
		if (known.has(`${first}-${second}`)) continue;
		const result = statements.add.run({
			member_kind: kind,
			first_id: first,
			second_id: second,
			reason: typeof pair.reason === 'string' ? pair.reason.trim() : '',
			now
		});
		added += result.changes;
	}
	return added;
}

function owner(kind: MemberKind, id: number): MemberOwner {
	return kind === 'human'
		? { humanId: id }
		: kind === 'company'
			? { companyId: id }
			: { channelId: id };
}

/** A record's name and the facts that help tell it apart, or undefined when it is gone. */
function memberFacts(kind: MemberKind, id: number): MemberFacts | undefined {
	const facts: string[] = [];
	let name: string;
	if (kind === 'human') {
		const human = getHuman(id);
		if (!human) return undefined;
		name = human.human;
		const full = [human.firstName, human.familyName].filter(Boolean).join(' ');
		if (full && full !== name) facts.push(`Full name: ${full}`);
		if (human.birthday) facts.push(`Birthday: ${describeDay(human.birthday)}`);
		for (const d of listDetails(id, 'phone')) facts.push(`Phone: ${d.value}`);
		for (const d of listDetails(id, 'address')) facts.push(`Address: ${d.value}`);
	} else if (kind === 'company') {
		const company = getCompany(id);
		if (!company) return undefined;
		name = company.company;
		if (company.website) facts.push(`Website: ${company.website}`);
		for (const d of listCompanyDetails(id, 'phone')) facts.push(`Phone: ${d.value}`);
	} else {
		const channel = getChannel(id);
		if (!channel) return undefined;
		name = channel.channel;
		if (channel.website) facts.push(`Website: ${channel.website}`);
	}
	const groups = listGroups()
		.filter((g) => g.members.some((m) => m.kind === kind && m.id === id))
		.map((g) => g.humanGroup);
	if (groups.length) facts.push(`Groups: ${groups.join(', ')}`);
	for (const account of listSocialAccounts(kind, id))
		facts.push(`On ${account.platform}: ${account.url}`);
	const own = owner(kind, id);
	const sources = listSources().filter(
		(s) =>
			('humanId' in own && s.humanId === own.humanId) ||
			('companyId' in own && s.companyId === own.companyId) ||
			('channelId' in own && s.channelId === own.channelId)
	);
	for (const s of sources) facts.push(`Source: ${s.contentSource}`);
	for (const r of listReferences(own)) facts.push(`From ${REFERENCE_SOURCES[r.source]}`);
	return { kind, id, name, facts };
}

/**
 * The pairs still waiting for the user, oldest first, with both records described. A pair whose
 * record has since been deleted or merged away is dropped.
 */
export function pendingCandidates(kind: MemberKind): MergeCandidate[] {
	const pending: MergeCandidate[] = [];
	for (const row of statements.listPending.all({ member_kind: kind })) {
		const first = memberFacts(kind, row.firstId);
		const second = memberFacts(kind, row.secondId);
		if (!first || !second) {
			statements.setStatus.run({ merge_candidate_id: row.mergeCandidateId, status: 'DISMISSED' });
			continue;
		}
		pending.push({ mergeCandidateId: row.mergeCandidateId, reason: row.reason, first, second });
	}
	return pending;
}

export function setCandidateStatus(mergeCandidateId: number, status: 'MERGED' | 'DISMISSED') {
	statements.setStatus.run({ merge_candidate_id: mergeCandidateId, status });
}
