import { fail } from '@sveltejs/kit';
import { oauthActions, oauthLoad } from '#lib/server/integrations/oauth-page.ts';
import { isRedditConnected } from '#lib/server/integrations/reddit.ts';
import { IntegrationError } from '#lib/server/integrations/types.ts';
import {
	countImported,
	importRedditSubscriptions,
	listImported
} from '#lib/server/reddit/subscriptions.ts';
import { paginate, requestedPage } from '#lib/pagination.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = (event) => {
	const pages = paginate(countImported(), requestedPage(event.url, 'imported'), PAGE_SIZE);
	return {
		...oauthLoad('reddit')(event),
		redditConnected: isRedditConnected(),
		pages,
		imported: listImported(pages.pageSize, pages.offset)
	};
};

export const actions: Actions = {
	...oauthActions('reddit'),

	importSubscriptions: async () => {
		try {
			const result = await importRedditSubscriptions();
			return {
				reddit: {
					tone: 'ok' as const,
					message: `Found ${result.total} subreddits and people you follow; added ${result.added}. Their posts are read in the background and show up in Consume.`
				}
			};
		} catch (error) {
			if (!(error instanceof IntegrationError)) throw error;
			return fail(502, { reddit: { tone: 'danger' as const, message: error.message } });
		}
	}
};
