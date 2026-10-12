import { eq } from 'drizzle-orm';
import { TOKEN_ENC_KEY } from '$app/env/private';
import { decryptSecret, encryptSecret } from '../crypto.ts';
import { db } from '../db/index.ts';
import { oauthClients } from '../db/schema.ts';
import type { OAuthClientConfig, PlatformId } from './types.ts';

export function getOAuthClient(platform: PlatformId): OAuthClientConfig | undefined {
	const row = db.select().from(oauthClients).where(eq(oauthClients.platform, platform)).get();
	if (!row) return undefined;
	return {
		clientId: row.clientId,
		clientSecret: decryptSecret(row.clientSecretEnc, TOKEN_ENC_KEY)
	};
}

export function saveOAuthClient(platform: PlatformId, config: OAuthClientConfig, now = Date.now()) {
	const row = {
		platform,
		clientId: config.clientId,
		clientSecretEnc: encryptSecret(config.clientSecret, TOKEN_ENC_KEY),
		updatedAt: now
	};
	db.insert(oauthClients)
		.values(row)
		.onConflictDoUpdate({ target: oauthClients.platform, set: row })
		.run();
}

export function deleteOAuthClient(platform: PlatformId) {
	db.delete(oauthClients).where(eq(oauthClients.platform, platform)).run();
}
