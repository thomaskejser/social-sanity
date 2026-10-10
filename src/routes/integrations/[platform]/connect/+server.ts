import { error, redirect } from '@sveltejs/kit';
import {
	createOAuthState,
	OAUTH_STATE_COOKIE,
	OAUTH_STATE_MAX_AGE_SECONDS
} from '#lib/server/integrations/oauth-state.ts';
import { redirectUriFor } from '#lib/server/integrations/redirect-uri.ts';
import { getIntegration } from '#lib/server/integrations/registry.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, cookies, url }) => {
	const entry = getIntegration(params.platform);
	if (!entry) error(404, 'Unknown integration');
	if (!entry.configured) error(400, `${entry.integration.name} is not configured`);

	const state = createOAuthState(entry.integration.id);
	cookies.set(OAUTH_STATE_COOKIE, state, {
		path: '/integrations',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: OAUTH_STATE_MAX_AGE_SECONDS
	});

	redirect(
		302,
		entry.integration.authorizeUrl(state, redirectUriFor(entry.integration.id, url.origin)),
		{ external: [entry.integration.authorizeOrigin] }
	);
};
