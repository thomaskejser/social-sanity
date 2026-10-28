import { fail } from '@sveltejs/kit';
import {
	countChannels,
	countUngroupedChannels,
	listUngroupedChannels,
	listChannels,
	setChannelKudos
} from '#lib/server/channels/store.ts';
import { groupActions } from '#lib/server/groups/actions.ts';
import { idField, kudosField } from '#lib/server/humans/form.ts';
import { listGroups } from '#lib/server/humans/store.ts';
import { paginate, requestedPage } from '#lib/pagination.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const UNGROUPED_PAGE_SIZE = 25;

function ungroupedPage(url: URL) {
	const pages = paginate(
		countUngroupedChannels(),
		requestedPage(url, 'ungrouped'),
		UNGROUPED_PAGE_SIZE
	);
	return {
		pages,
		open: url.searchParams.has('ungrouped'),
		members: listUngroupedChannels(pages.pageSize, pages.offset).map((m) => ({
			...m,
			kind: 'channel' as const
		}))
	};
}

export const load: PageServerLoad = ({ url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	const pages = search ? paginate(countChannels(search), requestedPage(url), PAGE_SIZE) : null;
	return {
		search,
		total: countChannels(''),
		results: pages && {
			pages,
			channels: listChannels(search, pages.pageSize, pages.offset)
		},
		groups: listGroups(),
		ungrouped: ungroupedPage(url)
	};
};

export const actions: Actions = {
	...groupActions,

	kudos: async ({ request }) => {
		const form = await request.formData();
		const channelId = idField(form, 'channelId');
		const kudos = kudosField(form);
		if (!channelId || kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setChannelKudos(channelId, kudos);
	}
};
