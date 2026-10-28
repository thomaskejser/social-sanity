import { db } from '../db/index.ts';
import { moveAvatar } from '../avatars/store.ts';
import {
	addChannelMember,
	createChannel,
	deleteChannel,
	getChannel,
	setChannelKudos,
	updateChannel
} from '../channels/store.ts';
import {
	addCompanyDetail,
	addCompanyMember,
	createCompany,
	deleteCompany,
	getCompany,
	listCompanyDetails,
	setCompanyKudos,
	updateCompany
} from '../companies/store.ts';
import {
	addDetail,
	addMember,
	createHuman,
	deleteHuman,
	getHuman,
	listDetails,
	listGroups,
	middleNames,
	setHumanKudos,
	updateHuman
} from '../humans/store.ts';
import { moveReferences, type MemberOwner } from '../references/store.ts';
import { addSocialAccount, listSocialAccounts } from '../social-accounts.ts';
import { deleteSource, listSources, moveSources } from '../sources/store.ts';
import type { Detail, DetailKind } from '#lib/humans/details.ts';
import type { MemberKind } from '#lib/groups/member.ts';

/** What every kind holds, plus the details only some kinds have. */
type Held = { name: string; kudos: number; website: string; notes: string };

type ContactKind = 'phone' | 'address';

type Kind = {
	noun: string;
	get(id: number): Held | undefined;
	create(record: Held, now: number): number;
	setKudos(id: number, kudos: number): void;
	addToGroup(humanGroupId: number, id: number): void;
	remove(id: number): void;
	owner(id: number): MemberOwner;
	/** Whether it holds phone numbers and addresses. */
	contacts: boolean;
	/** Whether it holds a website and notes. */
	website: boolean;
	listContacts?(id: number, kind: ContactKind): Detail[];
	addContact?(id: number, kind: ContactKind, detail: Detail): void;
	/** Details only this kind holds, described for the confirmation; empty ones are left out. */
	ownDetails(id: number): string[];
	/** Fills in what `intoId` lacks from `fromId`, both of this kind; nothing it has is replaced. */
	absorb(fromId: number, intoId: number, now: number): void;
};

/** Copies details of one kind from one record to another, skipping values it already has. */
function copyDetails(
	list: (id: number) => Detail[],
	add: (id: number, detail: Detail) => void,
	fromId: number,
	intoId: number
) {
	const have = new Set(list(intoId).map((d) => d.value.toLowerCase()));
	for (const detail of list(fromId)) if (!have.has(detail.value.toLowerCase())) add(intoId, detail);
}

const CONTACTS: { kind: ContactKind; one: string; many: string }[] = [
	{ kind: 'phone', one: 'phone number', many: 'phone numbers' },
	{ kind: 'address', one: 'address', many: 'addresses' }
];

const HUMAN_DETAILS: DetailKind[] = ['nickname', 'phone', 'address', 'specialDay'];

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

const KINDS: { [K in MemberKind]: Kind } = {
	human: {
		noun: 'human',
		get(id) {
			const human = getHuman(id);
			return human && { name: human.human, kudos: human.kudos, website: '', notes: '' };
		},
		create: (record, now) =>
			createHuman(
				{ human: record.name, firstName: '', middleNames: [], familyName: '', birthday: '' },
				now
			),
		setKudos: setHumanKudos,
		addToGroup: addMember,
		remove: (id) => deleteHuman(id),
		owner: (humanId) => ({ humanId }),
		contacts: true,
		website: false,
		listContacts: (id, kind) => listDetails(id, kind),
		addContact: (id, kind, detail) => addDetail(id, kind, detail),
		ownDetails(id) {
			const human = getHuman(id)!;
			const nicknames = listDetails(id, 'nickname').length;
			const specialDays = listDetails(id, 'specialDay').length;
			return [
				human.firstName && `First name: ${human.firstName}`,
				middleNames(id).length && `Middle names: ${middleNames(id).join(' ')}`,
				human.familyName && `Family name: ${human.familyName}`,
				human.birthday && 'Birthday',
				nicknames && count(nicknames, 'nickname', 'nicknames'),
				specialDays && count(specialDays, 'special day', 'special days')
			].filter((item): item is string => !!item);
		},
		absorb(fromId, intoId, now) {
			const from = getHuman(fromId)!;
			const into = getHuman(intoId)!;
			const intoMiddle = middleNames(intoId);
			updateHuman(
				intoId,
				{
					human: into.human,
					firstName: into.firstName || from.firstName,
					middleNames: intoMiddle.length ? intoMiddle : middleNames(fromId),
					familyName: into.familyName || from.familyName,
					birthday: into.birthday || from.birthday
				},
				now
			);
			for (const kind of HUMAN_DETAILS)
				copyDetails(
					(id) => listDetails(id, kind),
					(id, detail) => addDetail(id, kind, detail),
					fromId,
					intoId
				);
		}
	},
	company: {
		noun: 'company',
		get(id) {
			const company = getCompany(id);
			return (
				company && {
					name: company.company,
					kudos: company.kudos,
					website: company.website,
					notes: company.notes
				}
			);
		},
		create: (record, now) =>
			createCompany({ company: record.name, website: record.website, notes: record.notes }, now),
		setKudos: setCompanyKudos,
		addToGroup: addCompanyMember,
		remove: (id) => deleteCompany(id),
		owner: (companyId) => ({ companyId }),
		contacts: true,
		website: true,
		listContacts: (id, kind) => listCompanyDetails(id, kind),
		addContact: (id, kind, detail) => addCompanyDetail(id, kind, detail),
		ownDetails: () => [],
		absorb(fromId, intoId, now) {
			const from = getCompany(fromId)!;
			const into = getCompany(intoId)!;
			updateCompany(
				intoId,
				{
					company: into.company,
					website: into.website || from.website,
					notes: into.notes || from.notes
				},
				now
			);
			for (const { kind } of CONTACTS)
				copyDetails(
					(id) => listCompanyDetails(id, kind),
					(id, detail) => addCompanyDetail(id, kind, detail),
					fromId,
					intoId
				);
		}
	},
	channel: {
		noun: 'channel',
		get(id) {
			const channel = getChannel(id);
			return (
				channel && {
					name: channel.channel,
					kudos: channel.kudos,
					website: channel.website,
					notes: channel.notes
				}
			);
		},
		create: (record, now) =>
			createChannel({ channel: record.name, website: record.website, notes: record.notes }, now),
		setKudos: setChannelKudos,
		addToGroup: addChannelMember,
		remove: (id) => deleteChannel(id),
		owner: (channelId) => ({ channelId }),
		contacts: false,
		website: true,
		ownDetails: () => [],
		absorb(fromId, intoId, now) {
			const from = getChannel(fromId)!;
			const into = getChannel(intoId)!;
			updateChannel(
				intoId,
				{
					channel: into.channel,
					website: into.website || from.website,
					notes: into.notes || from.notes
				},
				now
			);
		}
	}
};

/** The display name of a human, company or channel. */
export function memberName(kind: MemberKind, id: number): string | undefined {
	return KINDS[kind].get(id)?.name;
}

export type ConversionPreview = { keep: string[]; strip: string[] };

/** What turning a record into another kind keeps, and the non-empty details it drops. */
export function conversionPreview(
	from: MemberKind,
	id: number,
	to: MemberKind
): ConversionPreview | undefined {
	const source = KINDS[from];
	const target = KINDS[to];
	const record = source.get(id);
	if (!record || from === to) return undefined;

	const keep = [
		`Name: ${record.name}`,
		'Kudos',
		'Picture, groups, content sources, social media accounts and links to Google Contacts and YouTube'
	];
	const strip = [...source.ownDetails(id)];
	if (source.contacts) {
		const contacts = CONTACTS.map((c) => ({ ...c, n: source.listContacts!(id, c.kind).length }));
		const present = contacts.filter((c) => c.n);
		if (target.contacts && present.length) keep.push('Phone numbers and addresses');
		if (!target.contacts) strip.push(...present.map((c) => count(c.n, c.one, c.many)));
	}
	if (source.website && target.website && (record.website || record.notes))
		keep.push('Website and notes');
	if (source.website && !target.website) {
		if (record.website) strip.push(`Website: ${record.website}`);
		if (record.notes) strip.push('Notes');
	}
	return { keep, strip };
}

/**
 * Replaces a human, company or channel with a record of another kind holding what that kind can
 * hold (see `conversionPreview`). Outside IDs move over, so imports keep finding the record and
 * nothing is left as a tombstone. Returns the new record's ID.
 */
export const convertMember = db.transaction(
	(from: MemberKind, id: number, to: MemberKind, now = Date.now()): number => {
		const source = KINDS[from];
		const target = KINDS[to];
		const record = source.get(id);
		if (!record) throw new Error(`No ${source.noun} ${id}`);
		if (from === to) return id;

		const newId = target.create(
			target.website ? record : { ...record, website: '', notes: '' },
			now
		);
		target.setKudos(newId, record.kudos);
		if (source.contacts && target.contacts) {
			for (const { kind } of CONTACTS)
				for (const detail of source.listContacts!(id, kind))
					target.addContact!(newId, kind, detail);
		}
		for (const group of listGroups())
			if (group.members.some((m) => m.kind === from && m.id === id))
				target.addToGroup(group.humanGroupId, newId);
		for (const account of listSocialAccounts(from, id))
			addSocialAccount(to, newId, { platform: account.platform, url: account.url });
		moveSources(source.owner(id), target.owner(newId));
		moveReferences(source.owner(id), target.owner(newId));
		moveAvatar(source.owner(id), target.owner(newId));
		source.remove(id);
		return newId;
	}
);

/**
 * Folds one human, company or channel into another of the same kind: `intoId` keeps its own name
 * and details, gains what only `fromId` had (groups, contact details, social accounts, sources,
 * outside IDs, pictures, missing names or website) and the higher kudos. `fromId` is then deleted;
 * its outside IDs have moved, so nothing is left as a tombstone.
 */
export const mergeMembers = db.transaction(
	(kind: MemberKind, fromId: number, intoId: number, now = Date.now()) => {
		const k = KINDS[kind];
		const from = k.get(fromId);
		const into = k.get(intoId);
		if (!from || !into) throw new Error(`No ${k.noun} ${from ? intoId : fromId}`);
		if (fromId === intoId) return;

		k.setKudos(intoId, Math.max(from.kudos, into.kudos));
		k.absorb(fromId, intoId, now);
		for (const group of listGroups()) {
			const members = group.members.filter((m) => m.kind === kind);
			if (members.some((m) => m.id === fromId) && !members.some((m) => m.id === intoId))
				k.addToGroup(group.humanGroupId, intoId);
		}
		for (const account of listSocialAccounts(kind, fromId))
			addSocialAccount(kind, intoId, { platform: account.platform, url: account.url });

		const source = k.owner(fromId);
		const target = k.owner(intoId);
		const ownedBy = (owner: MemberOwner) => (s: ReturnType<typeof listSources>[number]) =>
			('humanId' in owner && s.humanId === owner.humanId) ||
			('companyId' in owner && s.companyId === owner.companyId) ||
			('channelId' in owner && s.channelId === owner.channelId);
		const sources = listSources();
		const kept = new Set(sources.filter(ownedBy(target)).map((s) => s.contentSource));
		for (const s of sources.filter(ownedBy(source)))
			if (kept.has(s.contentSource)) deleteSource(s.contentSourceId);
		moveSources(source, target);
		moveReferences(source, target);
		moveAvatar(source, target);
		k.remove(fromId);
	}
);
