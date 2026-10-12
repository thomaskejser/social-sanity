import { listAccounts } from '#lib/server/integrations/accounts.ts';
import { listIntegrations } from '#lib/server/integrations/registry.ts';
import { integrationStatus } from '#lib/integrations/status.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const accounts = listAccounts();
	return {
		integrations: listIntegrations().map(({ integration, configured }) => {
			const account = accounts.find((a) => a.platform === integration.id) ?? null;
			return {
				id: integration.id,
				name: integration.name,
				status: integrationStatus(configured, account)
			};
		})
	};
};
