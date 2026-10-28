import { db } from '../db/index.ts';
import { readPresence, type Presence } from '#lib/members/presence.ts';
import { buryReferences } from '../references/store.ts';
import listSql from './sql/list-channels.sql?raw';
import countSql from './sql/count-channels.sql?raw';
import countUngroupedSql from './sql/count-ungrouped.sql?raw';
import listUngroupedSql from './sql/list-ungrouped.sql?raw';
import getSql from './sql/get-channel.sql?raw';
import findByNameSql from './sql/find-channel-by-name.sql?raw';
import createSql from './sql/create-channel.sql?raw';
import updateSql from './sql/update-channel.sql?raw';
import deleteSql from './sql/delete-channel.sql?raw';
import setKudosSql from './sql/set-kudos.sql?raw';
import renameSql from './sql/rename-channel.sql?raw';
import addMemberSql from './sql/add-member.sql?raw';
import removeMemberSql from './sql/remove-member.sql?raw';
import removeFromAllGroupsSql from './sql/remove-from-all-groups.sql?raw';

export type ChannelSummary = {
	channelId: number;
	channel: string;
	kudos: number;
	fromYouTube: boolean;
	groupIds: number[];
} & Presence;

/** A source of content that is not one person or company, e.g. "Toy Poodle Fun on Instagram". */
export type Channel = {
	channelId: number;
	/** Display name. */
	channel: string;
	website: string;
	notes: string;
	kudos: number;
};

export type ChannelInput = { channel: string; website: string; notes: string };

const statements = {
	list: db.prepare<
		[{ search: string; limit: number; offset: number }],
		{
			channelId: number;
			channel: string;
			kudos: number;
			fromYouTube: number;
			groupIds: string;
			avatar: number;
			accounts: string;
		}
	>(listSql),
	count: db.prepare<[{ search: string }], { total: number }>(countSql),
	countUngrouped: db.prepare<[], { total: number }>(countUngroupedSql),
	listUngrouped: db.prepare<
		[{ limit: number; offset: number }],
		{ id: number; name: string; avatar: number; accounts: string }
	>(listUngroupedSql),
	get: db.prepare<[{ channel_id: number }], Channel>(getSql),
	findByName: db.prepare<[{ name: string }], { channelId: number }>(findByNameSql),
	create: db.prepare<[Record<string, unknown>], { channelId: number }>(createSql),
	update: db.prepare(updateSql),
	delete: db.prepare(deleteSql),
	setKudos: db.prepare(setKudosSql),
	rename: db.prepare(renameSql),
	addMember: db.prepare(addMemberSql),
	removeMember: db.prepare(removeMemberSql),
	removeFromAllGroups: db.prepare(removeFromAllGroupsSql)
};

/** Channels whose name contains `search` (any case), names starting with it first. */
export function listChannels(search: string, limit: number, offset: number): ChannelSummary[] {
	return statements.list.all({ search, limit, offset }).map((row) => ({
		...readPresence(row),
		fromYouTube: row.fromYouTube === 1,
		groupIds: JSON.parse(row.groupIds) as number[]
	}));
}

export function countChannels(search: string): number {
	return statements.count.get({ search })!.total;
}

export function countUngroupedChannels(): number {
	return statements.countUngrouped.get()!.total;
}

/** Channels in no group, in name order. */
export function listUngroupedChannels(limit: number, offset: number) {
	return statements.listUngrouped.all({ limit, offset }).map(readPresence);
}

export function getChannel(channelId: number): Channel | undefined {
	return statements.get.get({ channel_id: channelId });
}

/** The first channel named `name`, ignoring case. */
export function findChannelByName(name: string): number | undefined {
	return statements.findByName.get({ name })?.channelId;
}

export function createChannel(input: ChannelInput, now = Date.now(), kudos = 0): number {
	return statements.create.get({ ...input, kudos, now })!.channelId;
}

export function updateChannel(channelId: number, input: ChannelInput, now = Date.now()) {
	statements.update.run({ ...input, channel_id: channelId, now });
}

/** Deletes a channel. Its outside IDs are kept as tombstones, so imports don't bring it back. */
export const deleteChannel = db.transaction((channelId: number, now = Date.now()) => {
	const channel = getChannel(channelId);
	if (!channel) return;
	buryReferences({ channelId }, channel.channel, now);
	statements.delete.run({ channel_id: channelId });
});

export function renameChannel(channelId: number, name: string, now = Date.now()) {
	statements.rename.run({ channel_id: channelId, name, now });
}

export function setChannelKudos(channelId: number, kudos: number) {
	statements.setKudos.run({ channel_id: channelId, kudos });
}

export function addChannelMember(humanGroupId: number, channelId: number) {
	statements.addMember.run({ human_group_id: humanGroupId, channel_id: channelId });
}

export function removeChannelMember(humanGroupId: number, channelId: number) {
	statements.removeMember.run({ human_group_id: humanGroupId, channel_id: channelId });
}

export function removeChannelFromAllGroups(channelId: number) {
	statements.removeFromAllGroups.run({ channel_id: channelId });
}

/** Moves a channel from one group to another, as one change. */
export const moveChannelMember = db.transaction(
	(fromGroupId: number, toGroupId: number, channelId: number) => {
		addChannelMember(toGroupId, channelId);
		removeChannelMember(fromGroupId, channelId);
	}
);
