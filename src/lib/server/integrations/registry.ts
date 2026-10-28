import { getOAuthClient } from './clients.ts';
import { createGoogle, createYouTube } from './google.ts';
import { createInstagram } from './instagram.ts';
import { createLinkedIn } from './linkedin.ts';
import { createReddit } from './reddit.ts';
import type { Integration, OAuthClientConfig, IntegrationId } from './types.ts';

export type IntegrationEntry = {
	integration: Integration;
	/** False until the developer app's credentials have been entered. */
	configured: boolean;
	/** Client ID of the developer app, when configured. */
	clientId: string | null;
};

const factories: Record<IntegrationId, (config: OAuthClientConfig) => Integration> = {
	linkedin: createLinkedIn,
	instagram: createInstagram,
	google: createGoogle,
	youtube: createYouTube,
	reddit: createReddit
};

const unconfigured: OAuthClientConfig = { clientId: '', clientSecret: '' };

function entry(id: IntegrationId): IntegrationEntry {
	const client = getOAuthClient(id);
	return {
		integration: factories[id](client ?? unconfigured),
		configured: !!client,
		clientId: client?.clientId ?? null
	};
}

export function listIntegrations(): IntegrationEntry[] {
	return (Object.keys(factories) as IntegrationId[]).map(entry);
}

export function getIntegration(id: string): IntegrationEntry | undefined {
	return Object.hasOwn(factories, id) ? entry(id as IntegrationId) : undefined;
}

export function isIntegrationId(id: string): id is IntegrationId {
	return Object.hasOwn(factories, id);
}
