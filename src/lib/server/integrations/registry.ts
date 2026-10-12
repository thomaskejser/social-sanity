import { getOAuthClient } from './clients.ts';
import { createInstagram } from './instagram.ts';
import { createLinkedIn } from './linkedin.ts';
import type { Integration, OAuthClientConfig, PlatformId } from './types.ts';

export type IntegrationEntry = {
	integration: Integration;
	/** False until the developer app's credentials have been entered. */
	configured: boolean;
	/** Client ID of the developer app, when configured. */
	clientId: string | null;
};

const factories: Record<PlatformId, (config: OAuthClientConfig) => Integration> = {
	linkedin: createLinkedIn,
	instagram: createInstagram
};

const unconfigured: OAuthClientConfig = { clientId: '', clientSecret: '' };

function entry(id: PlatformId): IntegrationEntry {
	const client = getOAuthClient(id);
	return {
		integration: factories[id](client ?? unconfigured),
		configured: !!client,
		clientId: client?.clientId ?? null
	};
}

export function listIntegrations(): IntegrationEntry[] {
	return (Object.keys(factories) as PlatformId[]).map(entry);
}

export function getIntegration(id: string): IntegrationEntry | undefined {
	return Object.hasOwn(factories, id) ? entry(id as PlatformId) : undefined;
}

export function isPlatformId(id: string): id is PlatformId {
	return Object.hasOwn(factories, id);
}
