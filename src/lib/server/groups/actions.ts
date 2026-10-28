import { fail, type Action } from '@sveltejs/kit';
import {
	addCompanyMember,
	deleteCompany,
	renameCompany,
	moveCompanyMember,
	removeCompanyFromAllGroups,
	removeCompanyMember
} from '../companies/store.ts';
import {
	addChannelMember,
	deleteChannel,
	renameChannel,
	moveChannelMember,
	removeChannelFromAllGroups,
	removeChannelMember
} from '../channels/store.ts';
import { idField } from '../humans/form.ts';
import {
	addMember,
	createGroup,
	deleteGroup,
	deleteHuman,
	mergeGroup,
	renameHuman,
	listGroups,
	moveMember,
	removeFromAllGroups,
	renameGroup,
	removeMember,
	type MemberKind
} from '../humans/store.ts';
import { isMemberKind } from '#lib/groups/member.ts';
import { convertMember, memberName } from '../members/convert.ts';

const MEMBERS: Record<
	MemberKind,
	{
		add: (groupId: number, id: number) => void;
		remove: (groupId: number, id: number) => void;
		move: (fromGroupId: number, toGroupId: number, id: number) => void;
		ungroup: (id: number) => void;
		/** Deletes the human, company or channel itself, keeping its outside IDs as tombstones. */
		delete: (id: number) => void;
		rename: (id: number, name: string) => void;
	}
> = {
	human: {
		add: addMember,
		remove: removeMember,
		move: moveMember,
		ungroup: removeFromAllGroups,
		delete: (id) => deleteHuman(id),
		rename: (id, name) => renameHuman(id, name)
	},
	company: {
		add: addCompanyMember,
		remove: removeCompanyMember,
		move: moveCompanyMember,
		ungroup: removeCompanyFromAllGroups,
		delete: (id) => deleteCompany(id),
		rename: (id, name) => renameCompany(id, name)
	},
	channel: {
		add: addChannelMember,
		remove: removeChannelMember,
		move: moveChannelMember,
		ungroup: removeChannelFromAllGroups,
		delete: (id) => deleteChannel(id),
		rename: (id, name) => renameChannel(id, name)
	}
};

/** Reads `kind` and `memberId`: which human, company or channel a group action is about. */
function member(form: FormData) {
	const kind = form.get('kind');
	const id = idField(form, 'memberId');
	if (!isMemberKind(kind) || !id) return undefined;
	return { members: MEMBERS[kind], id };
}

/** Form actions for groups of humans and companies, shared by the Humans and Companies pages. */
export const groupActions = {
	createGroup: async ({ request }) => {
		const value = (await request.formData()).get('humanGroup');
		const humanGroup = typeof value === 'string' ? value.trim() : '';
		if (!humanGroup) return fail(400, { groupError: 'Name the group.' });
		if (listGroups().some((g) => g.humanGroup.toLowerCase() === humanGroup.toLowerCase()))
			return fail(409, { groupError: `There is already a group called ${humanGroup}.` });
		createGroup(humanGroup);
	},

	renameGroup: async ({ request }) => {
		const form = await request.formData();
		const humanGroupId = idField(form, 'humanGroupId');
		const value = form.get('humanGroup');
		const humanGroup = typeof value === 'string' ? value.trim() : '';
		if (!humanGroupId) return fail(400, { error: 'Unknown group.' });
		if (!humanGroup) return fail(400, { groupError: 'Name the group.' });
		const clash = listGroups().find(
			(g) =>
				g.humanGroupId !== humanGroupId && g.humanGroup.toLowerCase() === humanGroup.toLowerCase()
		);
		if (clash) return fail(409, { groupError: `There is already a group called ${humanGroup}.` });
		renameGroup(humanGroupId, humanGroup);
	},

	mergeGroup: async ({ request }) => {
		const form = await request.formData();
		const humanGroupId = idField(form, 'humanGroupId');
		const intoGroupId = idField(form, 'intoGroupId');
		const groups = listGroups();
		if (
			!humanGroupId ||
			!intoGroupId ||
			humanGroupId === intoGroupId ||
			!groups.some((g) => g.humanGroupId === humanGroupId) ||
			!groups.some((g) => g.humanGroupId === intoGroupId)
		)
			return fail(400, { groupError: 'Choose another group to merge into.' });
		mergeGroup(humanGroupId, intoGroupId);
	},

	deleteGroup: async ({ request }) => {
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId) return fail(400, { error: 'Unknown group.' });
		deleteGroup(humanGroupId);
	},

	convert: async ({ request }) => {
		const form = await request.formData();
		const kind = form.get('kind');
		const to = form.get('to');
		const id = idField(form, 'memberId');
		if (!isMemberKind(kind) || !isMemberKind(to) || kind === to || !id)
			return fail(400, { error: 'Unknown human, company or channel.' });
		const newId = convertMember(kind, id, to);
		return { converted: { kind: to, id: newId, name: memberName(to, newId) ?? '' } };
	},

	renameMember: async ({ request }) => {
		const form = await request.formData();
		const target = member(form);
		const value = form.get('name');
		const name = typeof value === 'string' ? value.trim() : '';
		if (!target) return fail(400, { error: 'Unknown human, company or channel.' });
		if (!name) return fail(400, { error: 'Enter a name.' });
		target.members.rename(target.id, name);
	},

	deleteMember: async ({ request }) => {
		const target = member(await request.formData());
		if (!target) return fail(400, { error: 'Unknown human, company or channel.' });
		target.members.delete(target.id);
	},

	addMember: async ({ request }) => {
		const form = await request.formData();
		const target = member(form);
		const humanGroupId = idField(form, 'humanGroupId');
		if (!target || !humanGroupId) return fail(400, { error: 'Unknown group or member.' });
		target.members.add(humanGroupId, target.id);
	},

	removeMember: async ({ request }) => {
		const form = await request.formData();
		const target = member(form);
		const humanGroupId = idField(form, 'humanGroupId');
		if (!target || !humanGroupId) return fail(400, { error: 'Unknown group or member.' });
		target.members.remove(humanGroupId, target.id);
	},

	moveMember: async ({ request }) => {
		const form = await request.formData();
		const target = member(form);
		const fromGroupId = idField(form, 'fromGroupId');
		const humanGroupId = idField(form, 'humanGroupId');
		if (!target || !fromGroupId || !humanGroupId)
			return fail(400, { error: 'Unknown group or member.' });
		target.members.move(fromGroupId, humanGroupId, target.id);
	},

	ungroup: async ({ request }) => {
		const target = member(await request.formData());
		if (!target) return fail(400, { error: 'Unknown member.' });
		target.members.ungroup(target.id);
	}
} satisfies Record<string, Action>;
