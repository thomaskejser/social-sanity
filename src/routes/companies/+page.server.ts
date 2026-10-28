import { fail } from '@sveltejs/kit';
import {
	countCompanies,
	countUngroupedCompanies,
	listUngroupedCompanies,
	listCompanies,
	setCompanyKudos
} from '#lib/server/companies/store.ts';
import { groupActions } from '#lib/server/groups/actions.ts';
import { idField, kudosField } from '#lib/server/humans/form.ts';
import { listGroups } from '#lib/server/humans/store.ts';
import { paginate, requestedPage } from '#lib/pagination.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const UNGROUPED_PAGE_SIZE = 25;

function ungroupedPage(url: URL) {
	const pages = paginate(
		countUngroupedCompanies(),
		requestedPage(url, 'ungrouped'),
		UNGROUPED_PAGE_SIZE
	);
	return {
		pages,
		open: url.searchParams.has('ungrouped'),
		members: listUngroupedCompanies(pages.pageSize, pages.offset).map((m) => ({
			...m,
			kind: 'company' as const
		}))
	};
}

export const load: PageServerLoad = ({ url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	const pages = search ? paginate(countCompanies(search), requestedPage(url), PAGE_SIZE) : null;
	return {
		search,
		total: countCompanies(''),
		results: pages && {
			pages,
			companies: listCompanies(search, pages.pageSize, pages.offset)
		},
		groups: listGroups(),
		ungrouped: ungroupedPage(url)
	};
};

export const actions: Actions = {
	...groupActions,

	kudos: async ({ request }) => {
		const form = await request.formData();
		const companyId = idField(form, 'companyId');
		const kudos = kudosField(form);
		if (!companyId || kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setCompanyKudos(companyId, kudos);
	}
};
