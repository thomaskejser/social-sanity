import { error, fail, redirect } from '@sveltejs/kit';
import { parseChannelForm } from '#lib/server/channels/form.ts';
import {
	addChannelMember,
	deleteChannel,
	getChannel,
	removeChannelMember,
	setChannelKudos,
	updateChannel
} from '#lib/server/channels/store.ts';
import { idField, kudosField } from '#lib/server/humans/form.ts';
import { listGroups } from '#lib/server/humans/store.ts';
import { addSource, deleteSource, listSources, parseSourceUri } from '#lib/server/sources/store.ts';
import {
	addSocialAccount,
	listSocialAccounts,
	removeSocialAccount
} from '#lib/server/social-accounts.ts';
import { parseSocialAccount } from '#lib/social-accounts.ts';
import { listReferences } from '#lib/server/references/store.ts';
import { claudeReady } from '#lib/server/claude.ts';
import { applyEnrichment, enrichErrorMessage, enrichMember } from '#lib/server/enrich/index.ts';
import { enrichedAt } from '#lib/server/enrich/walk.ts';
import { convertAction } from '#lib/server/members/convert-page.ts';
import type { Actions, PageServerLoad } from './$types';

function channelIdOf(params: { id: string }): number {
	const channelId = Number(params.id);
	if (!Number.isInteger(channelId) || !getChannel(channelId)) error(404, 'No such channel');
	return channelId;
}

export const load: PageServerLoad = ({ params }) => {
	const channelId = channelIdOf(params);
	return {
		channel: getChannel(channelId)!,
		socialAccounts: listSocialAccounts('channel', channelId),
		references: listReferences({ channelId }),
		sources: listSources().filter((s) => s.channelId === channelId),
		claudeConfigured: claudeReady(),
		enrichedAt: enrichedAt('channel', channelId),
		groups: listGroups().map((g) => ({
			humanGroupId: g.humanGroupId,
			humanGroup: g.humanGroup,
			member: g.members.some((m) => m.kind === 'channel' && m.id === channelId)
		}))
	};
};

export const actions: Actions = {
	convert: convertAction('channel'),

	save: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const result = parseChannelForm(await request.formData());
		if (!result.ok) return fail(400, { channelErrors: result.errors });
		updateChannel(channelId, result.input);
		return { saved: true };
	},

	kudos: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const kudos = kudosField(await request.formData());
		if (kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setChannelKudos(channelId, kudos);
	},

	addSocialAccount: async ({ params, request }) => {
		const id = channelIdOf(params);
		const account = parseSocialAccount(String((await request.formData()).get('url') ?? ''));
		if (!account)
			return fail(400, {
				socialError:
					'Not a profile address on a social media site this app knows. Add other sites as content sources.'
			});
		addSocialAccount('channel', id, account);
	},

	removeSocialAccount: async ({ params, request }) => {
		const id = channelIdOf(params);
		const socialAccountId = idField(await request.formData(), 'socialAccountId');
		if (!socialAccountId) return fail(400, { error: 'Unknown account.' });
		removeSocialAccount('channel', id, socialAccountId);
	},

	addSource: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const uri = parseSourceUri(String((await request.formData()).get('uri') ?? ''));
		if (!uri) return fail(400, { sourceError: 'Enter a full http:// or https:// address.' });
		addSource({ channelId }, uri);
	},

	enrich: async ({ params }) => {
		const channelId = channelIdOf(params);
		try {
			return { enrich: { enrichment: await enrichMember('channel', channelId) } };
		} catch (error) {
			return fail(502, { enrich: { error: enrichErrorMessage(error) } });
		}
	},

	applyEnrichment: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const error = await applyEnrichment('channel', channelId, await request.formData());
		if (error) return fail(400, { error });
		return { enrichmentApplied: true };
	},

	removeSource: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const contentSourceId = idField(await request.formData(), 'contentSourceId');
		const source = listSources().find(
			(s) => s.contentSourceId === contentSourceId && s.channelId === channelId
		);
		if (!source) return fail(400, { error: 'Unknown content source.' });
		deleteSource(source.contentSourceId);
	},

	addToGroup: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId || !listGroups().some((g) => g.humanGroupId === humanGroupId))
			return fail(400, { error: 'Unknown group.' });
		addChannelMember(humanGroupId, channelId);
	},

	removeFromGroup: async ({ params, request }) => {
		const channelId = channelIdOf(params);
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId) return fail(400, { error: 'Unknown group.' });
		removeChannelMember(humanGroupId, channelId);
	},

	delete: async ({ params }) => {
		deleteChannel(channelIdOf(params));
		redirect(303, '/channels');
	}
};
