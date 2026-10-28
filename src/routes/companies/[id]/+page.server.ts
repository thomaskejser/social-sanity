import { error, fail, redirect } from '@sveltejs/kit';
import { mapUrl, parseDetail } from '#lib/humans/details.ts';
import { parseCompanyForm } from '#lib/server/companies/form.ts';
import {
	addCompanyDetail,
	addCompanyMember,
	deleteCompany,
	getCompany,
	isCompanyDetailKind,
	listCompanyDetails,
	removeCompanyDetail,
	removeCompanyMember,
	setCompanyKudos,
	updateCompany
} from '#lib/server/companies/store.ts';
import { claudeReady } from '#lib/server/claude.ts';
import { applyEnrichment, enrichErrorMessage, enrichMember } from '#lib/server/enrich/index.ts';
import { enrichedAt } from '#lib/server/enrich/walk.ts';
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
import { convertAction } from '#lib/server/members/convert-page.ts';
import type { Actions, PageServerLoad } from './$types';

function companyIdOf(params: { id: string }): number {
	const companyId = Number(params.id);
	if (!Number.isInteger(companyId) || !getCompany(companyId)) error(404, 'No such company');
	return companyId;
}

export const load: PageServerLoad = ({ params }) => {
	const companyId = companyIdOf(params);
	return {
		company: getCompany(companyId)!,
		details: {
			phone: listCompanyDetails(companyId, 'phone'),
			address: listCompanyDetails(companyId, 'address')
		},
		socialAccounts: listSocialAccounts('company', companyId),
		references: listReferences({ companyId }),
		claudeConfigured: claudeReady(),
		enrichedAt: enrichedAt('company', companyId),
		sources: listSources().filter((s) => s.companyId === companyId),
		groups: listGroups().map((g) => ({
			humanGroupId: g.humanGroupId,
			humanGroup: g.humanGroup,
			member: g.members.some((m) => m.kind === 'company' && m.id === companyId)
		}))
	};
};

export const actions: Actions = {
	convert: convertAction('company'),

	save: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const result = parseCompanyForm(await request.formData());
		if (!result.ok) return fail(400, { companyErrors: result.errors });
		updateCompany(companyId, result.input);
		return { saved: true };
	},

	kudos: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const kudos = kudosField(await request.formData());
		if (kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setCompanyKudos(companyId, kudos);
	},

	addDetail: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const form = await request.formData();
		const kind = form.get('kind');
		if (!isCompanyDetailKind(kind)) return fail(400, { error: 'Unknown detail.' });
		const parsed = parseDetail(
			kind,
			String(form.get('type') ?? ''),
			String(form.get('value') ?? '')
		);
		if (!parsed.ok) return fail(400, { detailError: { kind, message: parsed.error } });
		addCompanyDetail(companyId, kind, {
			type: parsed.type,
			value: parsed.value,
			mapUrl: kind === 'address' ? mapUrl(parsed.value) : undefined
		});
	},

	removeDetail: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const form = await request.formData();
		const kind = form.get('kind');
		const detailId = idField(form, 'detailId');
		if (!isCompanyDetailKind(kind) || !detailId) return fail(400, { error: 'Unknown detail.' });
		removeCompanyDetail(companyId, kind, detailId);
	},

	addSocialAccount: async ({ params, request }) => {
		const id = companyIdOf(params);
		const account = parseSocialAccount(String((await request.formData()).get('url') ?? ''));
		if (!account)
			return fail(400, {
				socialError:
					'Not a profile address on a social media site this app knows. Add other sites as content sources.'
			});
		addSocialAccount('company', id, account);
	},

	removeSocialAccount: async ({ params, request }) => {
		const id = companyIdOf(params);
		const socialAccountId = idField(await request.formData(), 'socialAccountId');
		if (!socialAccountId) return fail(400, { error: 'Unknown account.' });
		removeSocialAccount('company', id, socialAccountId);
	},

	addSource: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const uri = parseSourceUri(String((await request.formData()).get('uri') ?? ''));
		if (!uri) return fail(400, { sourceError: 'Enter a full http:// or https:// address.' });
		addSource({ companyId }, uri);
	},

	removeSource: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const contentSourceId = idField(await request.formData(), 'contentSourceId');
		const source = listSources().find(
			(s) => s.contentSourceId === contentSourceId && s.companyId === companyId
		);
		if (!source) return fail(400, { error: 'Unknown content source.' });
		deleteSource(source.contentSourceId);
	},

	enrich: async ({ params }) => {
		const companyId = companyIdOf(params);
		try {
			return { enrich: { enrichment: await enrichMember('company', companyId) } };
		} catch (error) {
			return fail(502, { enrich: { error: enrichErrorMessage(error) } });
		}
	},

	applyEnrichment: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const error = await applyEnrichment('company', companyId, await request.formData());
		if (error) return fail(400, { error });
		return { enrichmentApplied: true };
	},

	addToGroup: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId || !listGroups().some((g) => g.humanGroupId === humanGroupId))
			return fail(400, { error: 'Unknown group.' });
		addCompanyMember(humanGroupId, companyId);
	},

	removeFromGroup: async ({ params, request }) => {
		const companyId = companyIdOf(params);
		const humanGroupId = idField(await request.formData(), 'humanGroupId');
		if (!humanGroupId) return fail(400, { error: 'Unknown group.' });
		removeCompanyMember(humanGroupId, companyId);
	},

	delete: async ({ params }) => {
		deleteCompany(companyIdOf(params));
		redirect(303, '/companies');
	}
};
