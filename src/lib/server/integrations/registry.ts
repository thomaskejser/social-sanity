import {
	INSTAGRAM_APP_ID,
	INSTAGRAM_APP_SECRET,
	LINKEDIN_CLIENT_ID,
	LINKEDIN_CLIENT_SECRET
} from '$app/env/private';
import { createInstagram } from './instagram.ts';
import { createLinkedIn } from './linkedin.ts';
import type { Integration, OAuthClientConfig, PlatformId } from './types.ts';

export type IntegrationEntry = {
	integration: Integration;
	/** False when the OAuth client credentials are missing from the environment. */
	configured: boolean;
};

function clientConfig(clientId?: string, clientSecret?: string): OAuthClientConfig | undefined {
	return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

const linkedin = clientConfig(LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET);
const instagram = clientConfig(INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET);
const unconfigured: OAuthClientConfig = { clientId: '', clientSecret: '' };

const entries: Record<PlatformId, IntegrationEntry> = {
	linkedin: { integration: createLinkedIn(linkedin ?? unconfigured), configured: !!linkedin },
	instagram: { integration: createInstagram(instagram ?? unconfigured), configured: !!instagram }
};

export function listIntegrations(): IntegrationEntry[] {
	return Object.values(entries);
}

export function getIntegration(id: string): IntegrationEntry | undefined {
	return Object.hasOwn(entries, id) ? entries[id as PlatformId] : undefined;
}
