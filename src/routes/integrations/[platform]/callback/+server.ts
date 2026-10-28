import { error, redirect } from '@sveltejs/kit';
import { saveAccount } from '#lib/server/integrations/accounts.ts';
import { isValidOAuthState, OAUTH_STATE_COOKIE } from '#lib/server/integrations/oauth-state.ts';
import { redirectUriFor } from '#lib/server/integrations/redirect-uri.ts';
import { getIntegration } from '#lib/server/integrations/registry.ts';
import { IntegrationError } from '#lib/server/integrations/types.ts';
import type { RequestHandler } from './$types';

function backTo(platform: string, params: Record<string, string>): never {
	redirect(303, `/integrations/${platform}?${new URLSearchParams(params)}`);
}

export const GET: RequestHandler = async ({ params, cookies, url }) => {
	const entry = getIntegration(params.platform);
	if (!entry?.configured) error(404, 'Unknown integration');
	const { integration } = entry;

	const storedState = cookies.get(OAUTH_STATE_COOKIE);
	cookies.delete(OAUTH_STATE_COOKIE, { path: '/integrations' });

	const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error');
	if (denied) backTo(integration.id, { error: `${integration.name}: ${denied}` });

	if (!isValidOAuthState(integration.id, url.searchParams.get('state'), storedState)) {
		backTo(integration.id, {
			error: `${integration.name}: sign-in expired or was tampered with. Try again.`
		});
	}

	const code = url.searchParams.get('code');
	if (!code)
		backTo(integration.id, { error: `${integration.name}: no authorisation code returned.` });

	try {
		const identity = await integration.exchangeCode(
			code,
			redirectUriFor(integration.id, url.origin)
		);
		saveAccount(integration.id, identity);
	} catch (err) {
		console.error(err);
		const message =
			err instanceof IntegrationError ? err.message : 'unexpected error while connecting';
		backTo(integration.id, { error: `${integration.name}: ${message}` });
	}

	backTo(integration.id, { connected: '1' });
};
