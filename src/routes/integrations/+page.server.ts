import { fail } from '@sveltejs/kit';
import { deleteAccount, listAccounts } from '#lib/server/integrations/accounts.ts';
import { redirectUriFor } from '#lib/server/integrations/redirect-uri.ts';
import { getIntegration, listIntegrations } from '#lib/server/integrations/registry.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const accounts = listAccounts();
	const connectedId = url.searchParams.get('connected');

	return {
		error: url.searchParams.get('error'),
		connected: connectedId ? (getIntegration(connectedId)?.integration.name ?? null) : null,
		integrations: listIntegrations().map(({ integration, configured }) => {
			const account = accounts.find((a) => a.platform === integration.id);
			return {
				id: integration.id,
				name: integration.name,
				note: integration.note ?? null,
				consoleUrl: integration.consoleUrl,
				requiredEnv: integration.requiredEnv,
				redirectUri: redirectUriFor(integration.id, url.origin),
				autoRefresh: !!integration.refresh,
				configured,
				// Never send tokens to the browser — only metadata.
				account: account
					? {
							displayName: account.displayName,
							expiresAt: account.expiresAt,
							connectedAt: account.connectedAt,
							scopes: account.scopes.split(' ').filter(Boolean)
						}
					: null
			};
		})
	};
};

export const actions: Actions = {
	disconnect: async ({ request }) => {
		const platform = (await request.formData()).get('platform');
		if (typeof platform !== 'string' || !getIntegration(platform)) {
			return fail(400, { error: 'Unknown integration.' });
		}
		deleteAccount(platform);
		return { disconnected: getIntegration(platform)!.integration.name };
	}
};
