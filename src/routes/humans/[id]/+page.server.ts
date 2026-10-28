import { error, fail, redirect } from '@sveltejs/kit';
import { DETAIL_KINDS, isDetailKind, mapUrl, parseDetail } from '#lib/humans/details.ts';
import { idField, kudosField, parseHumanForm } from '#lib/server/humans/form.ts';
import {
	addDetail,
	addMember,
	deleteHuman,
	getHuman,
	listDetails,
	listGroups,
	middleNames,
	removeDetail,
	removeMember,
	setHumanKudos,
	updateHuman
} from '#lib/server/humans/store.ts';
import { deleteHumanAvatar, listHumanAvatars, showHumanAvatar } from '#lib/server/avatars/store.ts';
import { claudeReady } from '#lib/server/claude.ts';
import { applyEnrichment, enrichErrorMessage, enrichMember } from '#lib/server/enrich/index.ts';
import { enrichedAt } from '#lib/server/enrich/walk.ts';
import { addSource, deleteSource, listSources, parseSourceUri } from '#lib/server/sources/store.ts';
import {
	addSocialAccount,
	listSocialAccounts,
	removeSocialAccount
} from '#lib/server/social-accounts.ts';
import { parseSocialAccount } from '#lib/social-accounts.ts';
import { listReferences } from '#lib/server/references/store.ts';
import { convertAction } from '#lib/server/members/convert-page.ts';
import type { Actions, PageServerLoad } from './$types';

function humanIdOf(params: { id: string }): number {
	const humanId = Number(params.id);
	if (!Number.isInteger(humanId) || !getHuman(humanId)) error(404, 'No such human');
	return humanId;
}

export const load: PageServerLoad = ({ params }) => {
	const humanId = humanIdOf(params);
	const human = getHuman(humanId)!;
	return {
		human: { ...human, middleNames: middleNames(humanId) },
		details: Object.fromEntries(DETAIL_KINDS.map((kind) => [kind, listDetails(humanId, kind)])),
		socialAccounts: listSocialAccounts('human', humanId),
		references: listReferences({ humanId }),
		pictures: listHumanAvatars(humanId),
		sources: listSources().filter((s) => s.humanId === humanId),
		claudeConfigured: claudeReady(),
		enrichedAt: enrichedAt('human', humanId),
		groups: listGroups().map((g) => ({
			humanGroupId: g.humanGroupId,
			humanGroup: g.humanGroup,
			member: g.members.some((m) => m.kind === 'human' && m.id === humanId)
		}))
	};
};

export const actions: Actions = {
	convert: convertAction('human'),

	save: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const result = parseHumanForm(await request.formData());
		if (!result.ok) return fail(400, { humanErrors: result.errors });
		updateHuman(humanId, result.names);
		return { saved: true };
	},

	kudos: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const kudos = kudosField(await request.formData());
		if (kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setHumanKudos(humanId, kudos);
	},

	addDetail: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const form = await request.formData();
		const kind = form.get('kind');
		if (!isDetailKind(kind)) return fail(400, { error: 'Unknown detail.' });
		const parsed = parseDetail(
			kind,
			String(form.get('type') ?? ''),
			String(form.get('value') ?? '')
		);
		if (!parsed.ok) return fail(400, { detailError: { kind, message: parsed.error } });
		addDetail(humanId, kind, {
			type: parsed.type,
			value: parsed.value,
			mapUrl: kind === 'address' ? mapUrl(parsed.value) : undefined
		});
	},

	removeDetail: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const form = await request.formData();
		const kind = form.get('kind');
		const detailId = idField(form, 'detailId');
		if (!isDetailKind(kind) || !detailId) return fail(400, { error: 'Unknown detail.' });
		removeDetail(humanId, kind, detailId);
	},

	addSocialAccount: async ({ params, request }) => {
		const id = humanIdOf(params);
		const account = parseSocialAccount(String((await request.formData()).get('url') ?? ''));
		if (!account)
			return fail(400, {
				socialError:
					'Not a profile address on a social media site this app knows. Add other sites as content sources.'
			});
		addSocialAccount('human', id, account);
	},

	removeSocialAccount: async ({ params, request }) => {
		const id = humanIdOf(params);
		const socialAccountId = idField(await request.formData(), 'socialAccountId');
		if (!socialAccountId) return fail(400, { error: 'Unknown account.' });
		removeSocialAccount('human', id, socialAccountId);
	},

	addSource: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const uri = parseSourceUri(String((await request.formData()).get('uri') ?? ''));
		if (!uri) return fail(400, { sourceError: 'Enter a full http:// or https:// address.' });
		addSource({ humanId }, uri);
	},

	enrich: async ({ params }) => {
		const humanId = humanIdOf(params);
		try {
			return { enrich: { enrichment: await enrichMember('human', humanId) } };
		} catch (error) {
			return fail(502, { enrich: { error: enrichErrorMessage(error) } });
		}
	},

	showPicture: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const humanAvatarId = idField(await request.formData(), 'humanAvatarId');
		if (!humanAvatarId) return fail(400, { error: 'Unknown picture.' });
		showHumanAvatar(humanId, humanAvatarId);
	},

	removePicture: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const humanAvatarId = idField(await request.formData(), 'humanAvatarId');
		if (!humanAvatarId) return fail(400, { error: 'Unknown picture.' });
		deleteHumanAvatar(humanId, humanAvatarId);
	},

	applyEnrichment: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const error = await applyEnrichment('human', humanId, await request.formData());
		if (error) return fail(400, { error });
		return { enrichmentApplied: true };
	},

	removeSource: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const contentSourceId = idField(await request.formData(), 'contentSourceId');
		const source = listSources().find(
			(s) => s.contentSourceId === contentSourceId && s.humanId === humanId
		);
		if (!source) return fail(400, { error: 'Unknown content source.' });
		deleteSource(source.contentSourceId);
	},

	addToGroup: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId || !listGroups().some((g) => g.humanGroupId === humanGroupId))
			return fail(400, { error: 'Unknown group.' });
		addMember(humanGroupId, humanId);
	},

	removeFromGroup: async ({ params, request }) => {
		const humanId = humanIdOf(params);
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId) return fail(400, { error: 'Unknown group.' });
		removeMember(humanGroupId, humanId);
	},

	delete: async ({ params }) => {
		deleteHuman(humanIdOf(params));
		redirect(303, '/humans');
	}
};
