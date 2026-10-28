import { fail } from '@sveltejs/kit';
import { claudeReady } from '#lib/server/claude.ts';
import { oauthActions, oauthLoad } from '#lib/server/integrations/oauth-page.ts';
import { IntegrationError } from '#lib/server/integrations/types.ts';
import { listAccounts } from '#lib/server/integrations/accounts.ts';
import {
	countChannels,
	fetchSubscriptions,
	listChannels,
	sortChannels,
	sortState
} from '#lib/server/youtube/subscriptions.ts';
import { paginate, requestedPage } from '#lib/pagination.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = (event) => {
	const counts = countChannels();
	const pages = paginate(counts.imported, requestedPage(event.url, 'channels'), PAGE_SIZE);
	return {
		...oauthLoad('youtube')(event),
		hasAccount: listAccounts().some((a) => a.platform === 'youtube'),
		claudeConfigured: claudeReady(),
		counts,
		sorting: sortState(),
		pages,
		channels: listChannels(pages.pageSize, pages.offset)
	};
};

export const actions: Actions = {
	...oauthActions('youtube'),

	importSubscriptions: async () => {
		try {
			const result = await fetchSubscriptions();
			// Sorting takes a while; it runs on after the page answers, and errors show on the page.
			sortChannels().catch(() => {});
			return {
				youtube: {
					tone: 'ok' as const,
					message: `Imported ${result.total} subscriptions, ${result.new} of them new.`
				}
			};
		} catch (error) {
			if (!(error instanceof IntegrationError)) throw error;
			return fail(502, { youtube: { tone: 'danger' as const, message: error.message } });
		}
	}
};
