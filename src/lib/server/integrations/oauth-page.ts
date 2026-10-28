import { fail, type Action, type ServerLoad } from '@sveltejs/kit';
import { deleteAccount } from './accounts.ts';
import { parseOAuthClientForm } from './client-form.ts';
import { deleteOAuthClient, getOAuthClient, saveOAuthClient } from './clients.ts';
import { getIntegration, isIntegrationId } from './registry.ts';
import type { IntegrationId } from './types.ts';
import { oauthView } from './views.ts';

/** The load function of an OAuth integration's own page. */
export function oauthLoad(id: IntegrationId) {
	return (({ url }) => ({
		integration: oauthView(id, url.origin),
		connected: url.searchParams.has('connected'),
		error: url.searchParams.get('error')
	})) satisfies ServerLoad;
}

/** The form actions of an OAuth integration's own page. */
export function oauthActions(id: IntegrationId) {
	const name = getIntegration(id)!.integration.name;
	return {
		disconnect: async () => {
			deleteAccount(id);
			return { disconnected: name };
		},

		saveClient: async ({ request }) => {
			const result = parseOAuthClientForm(await request.formData());
			if (!result.ok) {
				return fail(400, {
					client: { platform: id, values: result.values, errors: result.errors }
				});
			}
			saveOAuthClient(id, result.config);
			return { clientSaved: name };
		},

		reuseClient: async ({ request }) => {
			const from = String((await request.formData()).get('from') ?? '');
			const source = isIntegrationId(from) ? getIntegration(from) : undefined;
			const family = getIntegration(id)!.integration.family;
			const client = source && getOAuthClient(source.integration.id);
			if (!family || !client || source.integration.family?.id !== family.id)
				return fail(400, { reuseError: 'That app cannot be used here.' });
			saveOAuthClient(id, client);
			return { clientReused: source.integration.name };
		},

		removeClient: async () => {
			deleteOAuthClient(id);
			return { clientRemoved: name };
		}
	} satisfies Record<string, Action>;
}
