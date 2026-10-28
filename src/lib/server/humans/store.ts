import { db } from '../db/index.ts';
import { buryReferences } from '../references/store.ts';
import type { Detail, DetailKind } from '#lib/humans/details.ts';
import type { Member, MemberKind } from '#lib/groups/member.ts';
import { readPresence, type Presence, type PresenceAccount } from '#lib/members/presence.ts';

export type { MemberKind };
import listSql from './sql/list-humans.sql?raw';
import countSql from './sql/count-humans.sql?raw';
import getSql from './sql/get-human.sql?raw';
import createSql from './sql/create-human.sql?raw';
import updateSql from './sql/update-human.sql?raw';
import findByNameSql from './sql/find-human-by-name.sql?raw';
import deleteSql from './sql/delete-human.sql?raw';
import setKudosSql from './sql/set-kudos.sql?raw';
import listMiddleNamesSql from './sql/list-middle-names.sql?raw';
import clearMiddleNamesSql from './sql/clear-middle-names.sql?raw';
import addMiddleNameSql from './sql/add-middle-name.sql?raw';
import listNicknamesSql from './sql/list-nicknames.sql?raw';
import addNicknameSql from './sql/add-nickname.sql?raw';
import deleteNicknameSql from './sql/delete-nickname.sql?raw';
import clearNicknamesSql from './sql/clear-nicknames.sql?raw';
import listAddressesSql from './sql/list-addresses.sql?raw';
import addAddressSql from './sql/add-address.sql?raw';
import deleteAddressSql from './sql/delete-address.sql?raw';
import clearAddressesSql from './sql/clear-addresses.sql?raw';
import listPhonesSql from './sql/list-phones.sql?raw';
import addPhoneSql from './sql/add-phone.sql?raw';
import deletePhoneSql from './sql/delete-phone.sql?raw';
import clearPhonesSql from './sql/clear-phones.sql?raw';
import listSpecialDaysSql from './sql/list-special-days.sql?raw';
import addSpecialDaySql from './sql/add-special-day.sql?raw';
import deleteSpecialDaySql from './sql/delete-special-day.sql?raw';
import clearSpecialDaysSql from './sql/clear-special-days.sql?raw';
import listGroupsSql from './sql/list-groups.sql?raw';
import createGroupSql from './sql/create-group.sql?raw';
import deleteGroupSql from './sql/delete-group.sql?raw';
import renameGroupSql from './sql/rename-group.sql?raw';
import renameHumanSql from './sql/rename-human.sql?raw';
import mergeGroupHumansSql from './sql/merge-group-humans.sql?raw';
import mergeGroupCompaniesSql from './sql/merge-group-companies.sql?raw';
import mergeGroupChannelsSql from './sql/merge-group-channels.sql?raw';
import addMemberSql from './sql/add-member.sql?raw';
import removeMemberSql from './sql/remove-member.sql?raw';
import removeFromAllGroupsSql from './sql/remove-from-all-groups.sql?raw';
import countUngroupedSql from './sql/count-ungrouped.sql?raw';
import listUngroupedSql from './sql/list-ungrouped.sql?raw';

export type HumanSummary = {
	humanId: number;
	human: string;
	kudos: number;
	fromGoogle: boolean;
	groupIds: number[];
} & Presence;

export type Human = {
	humanId: number;
	/** Display name; set on its own, never derived from the name parts once stored. */
	human: string;
	firstName: string;
	familyName: string;
	/** `YYYY-MM-DD`, `--MM-DD` when the year is unknown, or '' when not known. */
	birthday: string;
	kudos: number;
	createdAt: number;
	updatedAt: number;
};

export type HumanNames = {
	human: string;
	firstName: string;
	middleNames: string[];
	familyName: string;
	birthday: string;
};

/** A group of humans and companies. */
type GroupMemberRow = Omit<Member, 'avatar'> & { avatar: number; accounts: PresenceAccount[] };

export type HumanGroup = {
	humanGroupId: number;
	humanGroup: string;
	members: (Member & Presence)[];
};

const statements = {
	list: db.prepare<
		[{ search: string; limit: number; offset: number }],
		{
			humanId: number;
			human: string;
			kudos: number;
			fromGoogle: number;
			groupIds: string;
			avatar: number;
			accounts: string;
		}
	>(listSql),
	count: db.prepare<[{ search: string }], { total: number }>(countSql),
	get: db.prepare<[{ human_id: number }], Human>(getSql),
	create: db.prepare<[Record<string, unknown>], { humanId: number }>(createSql),
	update: db.prepare(updateSql),
	findByName: db.prepare<[{ name: string }], { humanId: number }>(findByNameSql),
	delete: db.prepare(deleteSql),
	setKudos: db.prepare(setKudosSql),
	listMiddleNames: db.prepare<[{ human_id: number }], { middleName: string }>(listMiddleNamesSql),
	clearMiddleNames: db.prepare(clearMiddleNamesSql),
	addMiddleName: db.prepare(addMiddleNameSql),
	listGroups: db.prepare<[], { humanGroupId: number; humanGroup: string; members: string }>(
		listGroupsSql
	),
	createGroup: db.prepare(createGroupSql),
	deleteGroup: db.prepare(deleteGroupSql),
	renameGroup: db.prepare(renameGroupSql),
	renameHuman: db.prepare(renameHumanSql),
	mergeGroup: [
		db.prepare(mergeGroupHumansSql),
		db.prepare(mergeGroupCompaniesSql),
		db.prepare(mergeGroupChannelsSql)
	],
	addMember: db.prepare(addMemberSql),
	removeMember: db.prepare(removeMemberSql),
	removeFromAllGroups: db.prepare(removeFromAllGroupsSql),
	countUngrouped: db.prepare<[], { total: number }>(countUngroupedSql),
	listUngrouped: db.prepare<
		[{ limit: number; offset: number }],
		{ id: number; name: string; avatar: number; accounts: string }
	>(listUngroupedSql)
};

const details: Record<
	DetailKind,
	{
		list: ReturnType<typeof db.prepare<[{ human_id: number }], Detail>>;
		add: ReturnType<typeof db.prepare>;
		remove: ReturnType<typeof db.prepare>;
		clear: ReturnType<typeof db.prepare>;
	}
> = {
	nickname: {
		list: db.prepare(listNicknamesSql),
		add: db.prepare(addNicknameSql),
		remove: db.prepare(deleteNicknameSql),
		clear: db.prepare(clearNicknamesSql)
	},
	address: {
		list: db.prepare(listAddressesSql),
		add: db.prepare(addAddressSql),
		remove: db.prepare(deleteAddressSql),
		clear: db.prepare(clearAddressesSql)
	},
	phone: {
		list: db.prepare(listPhonesSql),
		add: db.prepare(addPhoneSql),
		remove: db.prepare(deletePhoneSql),
		clear: db.prepare(clearPhonesSql)
	},
	specialDay: {
		list: db.prepare(listSpecialDaysSql),
		add: db.prepare(addSpecialDaySql),
		remove: db.prepare(deleteSpecialDaySql),
		clear: db.prepare(clearSpecialDaysSql)
	}
};

/** Humans whose display name contains `search` (any case), in name order. */
export function listHumans(search: string, limit: number, offset: number): HumanSummary[] {
	return statements.list.all({ search, limit, offset }).map((row) => ({
		...readPresence(row),
		fromGoogle: row.fromGoogle === 1,
		groupIds: JSON.parse(row.groupIds) as number[]
	}));
}

export function countHumans(search: string): number {
	return statements.count.get({ search })!.total;
}

export function getHuman(humanId: number): Human | undefined {
	return statements.get.get({ human_id: humanId });
}

export function middleNames(humanId: number): string[] {
	return statements.listMiddleNames.all({ human_id: humanId }).map((row) => row.middleName);
}

function replaceMiddleNames(humanId: number, names: string[]) {
	statements.clearMiddleNames.run({ human_id: humanId });
	names.forEach((name, position) =>
		statements.addMiddleName.run({ human_id: humanId, position, middle_name: name })
	);
}

let namesChanged = 0;

/**
 * A number that changes whenever a human is created, renamed or deleted, so callers can cache
 * anything derived from names. Every write to names goes through this module.
 */
export function namesVersion(): number {
	return namesChanged;
}

export const createHuman = db.transaction((names: HumanNames, now = Date.now()): number => {
	const { humanId } = statements.create.get({
		human: names.human,
		first_name: names.firstName,
		family_name: names.familyName,
		birthday: names.birthday,
		now
	})!;
	replaceMiddleNames(humanId, names.middleNames);
	namesChanged++;
	return humanId;
});

export const updateHuman = db.transaction(
	(humanId: number, names: HumanNames, now = Date.now()) => {
		statements.update.run({
			human_id: humanId,
			human: names.human,
			first_name: names.firstName,
			family_name: names.familyName,
			birthday: names.birthday,
			now
		});
		replaceMiddleNames(humanId, names.middleNames);
		namesChanged++;
	}
);

/** The first human whose display name is `name`, ignoring case. */
export function findHumanByName(name: string): number | undefined {
	return statements.findByName.get({ name })?.humanId;
}

/** Deletes a human. Its outside IDs are kept as tombstones, so imports don't bring it back. */
export const deleteHuman = db.transaction((humanId: number, now = Date.now()) => {
	const human = getHuman(humanId);
	if (!human) return;
	buryReferences({ humanId }, human.human, now);
	statements.delete.run({ human_id: humanId });
	namesChanged++;
});

export function setHumanKudos(humanId: number, kudos: number) {
	statements.setKudos.run({ human_id: humanId, kudos });
}

export function listDetails(humanId: number, kind: DetailKind): Detail[] {
	return details[kind].list.all({ human_id: humanId });
}

export function addDetail(
	humanId: number,
	kind: DetailKind,
	detail: { type: string; value: string; mapUrl?: string }
) {
	details[kind].add.run({
		human_id: humanId,
		type: detail.type,
		value: detail.value,
		...(kind === 'address' ? { map_url: detail.mapUrl ?? '' } : {})
	});
}

export function removeDetail(humanId: number, kind: DetailKind, detailId: number) {
	details[kind].remove.run({ human_id: humanId, detail_id: detailId });
}

/** Replaces every detail of one kind; used when Google Contacts overwrites a human. */
export function replaceDetails(
	humanId: number,
	kind: DetailKind,
	items: { type: string; value: string; mapUrl?: string }[]
) {
	details[kind].clear.run({ human_id: humanId });
	for (const item of items) addDetail(humanId, kind, item);
}

export function listGroups(): HumanGroup[] {
	return statements.listGroups.all().map((row) => ({
		...row,
		members: (JSON.parse(row.members) as GroupMemberRow[]).map((m) => ({
			...m,
			avatar: m.avatar === 1
		}))
	}));
}

export function createGroup(humanGroup: string) {
	statements.createGroup.run({ human_group: humanGroup });
}

export function renameGroup(humanGroupId: number, humanGroup: string) {
	statements.renameGroup.run({ human_group_id: humanGroupId, human_group: humanGroup });
}

/** Moves every human, company and channel of a group into another group, then deletes it. */
export const mergeGroup = db.transaction((humanGroupId: number, intoGroupId: number) => {
	if (humanGroupId === intoGroupId) return;
	for (const statement of statements.mergeGroup)
		statement.run({ human_group_id: humanGroupId, into_group_id: intoGroupId });
	deleteGroup(humanGroupId);
});

/** Changes only the display name; the name parts are left as they are. */
export function renameHuman(humanId: number, name: string, now = Date.now()) {
	statements.renameHuman.run({ human_id: humanId, name, now });
	namesChanged++;
}

export function deleteGroup(humanGroupId: number) {
	statements.deleteGroup.run({ human_group_id: humanGroupId });
}

export function addMember(humanGroupId: number, humanId: number) {
	statements.addMember.run({ human_group_id: humanGroupId, human_id: humanId });
}

export function removeMember(humanGroupId: number, humanId: number) {
	statements.removeMember.run({ human_group_id: humanGroupId, human_id: humanId });
}

/** Moves a human from one group to another, as one change. */
export const moveMember = db.transaction(
	(fromGroupId: number, toGroupId: number, humanId: number) => {
		addMember(toGroupId, humanId);
		removeMember(fromGroupId, humanId);
	}
);

export function removeFromAllGroups(humanId: number) {
	statements.removeFromAllGroups.run({ human_id: humanId });
}

export function countUngrouped(): number {
	return statements.countUngrouped.get()!.total;
}

/** Humans in no group, in name order. */
export function listUngrouped(limit: number, offset: number) {
	return statements.listUngrouped.all({ limit, offset }).map(readPresence);
}
