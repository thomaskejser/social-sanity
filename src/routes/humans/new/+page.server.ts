import { fail, redirect } from '@sveltejs/kit';
import { parseHumanForm } from '#lib/server/humans/form.ts';
import { createHuman } from '#lib/server/humans/store.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const result = parseHumanForm(await request.formData());
		if (!result.ok) return fail(400, { humanErrors: result.errors });
		redirect(303, `/humans/${createHuman(result.names)}`);
	}
};
