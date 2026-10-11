import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { SESSION_SECRET } from '$app/env/private';
import { startJobs } from '#lib/server/jobs.ts';
import { failInterruptedPublishing } from '#lib/server/posts/store.ts';
import { isValidSessionToken, SESSION_COOKIE } from '#lib/server/session.ts';

/** `/media/` is public so Instagram can fetch post media; file names are random UUIDs. */
const PUBLIC_PATHS = ['/login', '/media/'];

export const init: ServerInit = () => {
	failInterruptedPublishing();
	startJobs();
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.authenticated = isValidSessionToken(
		event.cookies.get(SESSION_COOKIE),
		SESSION_SECRET
	);

	const isPublic = PUBLIC_PATHS.some((path) => event.url.pathname.startsWith(path));
	if (!event.locals.authenticated && !isPublic) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	return resolve(event);
};
