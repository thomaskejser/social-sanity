import { SOCIAL_SANITY_TOKEN_ENC_KEY } from '$app/env/private';
import { decryptSecret, encryptSecret } from '../crypto.ts';
import { db } from '../db/index.ts';
import type { OAuthClientConfig, IntegrationId } from './types.ts';
import getSql from './sql/get-oauth-client.sql?raw';
import saveSql from './sql/save-oauth-client.sql?raw';
import deleteSql from './sql/delete-oauth-client.sql?raw';

const getStatement = db.prepare<
	[{ platform: string }],
	{ clientId: string; clientSecretEnc: string }
>(getSql);
const saveStatement = db.prepare(saveSql);
const deleteStatement = db.prepare(deleteSql);

export function getOAuthClient(platform: IntegrationId): OAuthClientConfig | undefined {
	const row = getStatement.get({ platform });
	if (!row) return undefined;
	return {
		clientId: row.clientId,
		clientSecret: decryptSecret(row.clientSecretEnc, SOCIAL_SANITY_TOKEN_ENC_KEY)
	};
}

export function saveOAuthClient(
	platform: IntegrationId,
	config: OAuthClientConfig,
	now = Date.now()
) {
	saveStatement.run({
		platform,
		client_id: config.clientId,
		client_secret_enc: encryptSecret(config.clientSecret, SOCIAL_SANITY_TOKEN_ENC_KEY),
		updated_at: now
	});
}

export function deleteOAuthClient(platform: IntegrationId) {
	deleteStatement.run({ platform });
}
