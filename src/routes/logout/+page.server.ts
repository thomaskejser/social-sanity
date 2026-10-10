import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
