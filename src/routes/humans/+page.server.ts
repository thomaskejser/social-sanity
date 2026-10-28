import { fail } from '@sveltejs/kit';
import { listAccounts } from '#lib/server/integrations/accounts.ts';
import { IntegrationError } from '#lib/server/integrations/types.ts';
import { idField, kudosField } from '#lib/server/humans/form.ts';
import { importGoogleContacts } from '#lib/server/humans/google-contacts.ts';
import {
	countHumans,
	countUngrouped,
	listUngrouped,
	listGroups,
	listHumans,
	setHumanKudos
} from '#lib/server/humans/store.ts';
import { paginate, requestedPage } from '#lib/pagination.ts';
import { groupActions } from '#lib/server/groups/actions.ts';
import { countCasingFixes, fixCasing } from '#lib/server/humans/casing.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const UNGROUPED_PAGE_SIZE = 10;

function ungroupedPage(url: URL) {
	const pages = paginate(countUngrouped(), requestedPage(url, 'ungrouped'), UNGROUPED_PAGE_SIZE);
	return {
		pages,
		open: url.searchParams.has('ungrouped'),
		members: listUngrouped(pages.pageSize, pages.offset).map((m) => ({
			...m,
			kind: 'human' as const
		}))
	};
}

export const load: PageServerLoad = ({ url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	const pages = search ? paginate(countHumans(search), requestedPage(url), PAGE_SIZE) : null;
	return {
		search,
		total: countHumans(''),
		results: pages && {
			pages,
			humans: listHumans(search, pages.pageSize, pages.offset)
		},
		groups: listGroups(),
		ungrouped: ungroupedPage(url),
		casingFixes: countCasingFixes(),
		googleConnected: listAccounts().some((a) => a.platform === 'google')
	};
};

export const actions: Actions = {
	...groupActions,

	kudos: async ({ request }) => {
		const form = await request.formData();
		const humanId = idField(form, 'humanId');
		const kudos = kudosField(form);
		if (!humanId || kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setHumanKudos(humanId, kudos);
	},

	fixCasing: async () => ({ casingFixed: fixCasing() }),

	importGoogle: async () => {
		try {
			return { imported: await importGoogleContacts() };
		} catch (error) {
			if (!(error instanceof IntegrationError)) throw error;
			return fail(502, { error: `Google Contacts: ${error.message}` });
		}
	}
};
