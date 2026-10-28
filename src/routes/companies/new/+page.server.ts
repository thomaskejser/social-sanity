import { fail, redirect } from '@sveltejs/kit';
import { parseCompanyForm } from '#lib/server/companies/form.ts';
import { createCompany } from '#lib/server/companies/store.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const result = parseCompanyForm(await request.formData());
		if (!result.ok) return fail(400, { companyErrors: result.errors });
		redirect(303, `/companies/${createCompany(result.input)}`);
	}
};
