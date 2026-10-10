import { fail, redirect } from '@sveltejs/kit';
import { APP_PASSWORD_HASH, SESSION_SECRET } from '$app/env/private';
import { verifyPassword } from '#lib/server/password.ts';
import {
	createSessionToken,
	SESSION_COOKIE,
	SESSION_MAX_AGE_SECONDS
} from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

/** Only allow same-site relative redirects. */
function safeRedirect(target: string | null): string {
	return target?.startsWith('/') && !target.startsWith('//') ? target : '/';
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.authenticated) redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const password = form.get('password');

		if (typeof password !== 'string' || !verifyPassword(password, APP_PASSWORD_HASH)) {
			return fail(400, { error: 'Incorrect password.' });
		}

		cookies.set(SESSION_COOKIE, createSessionToken(SESSION_SECRET), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_MAX_AGE_SECONDS
		});
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}
};
