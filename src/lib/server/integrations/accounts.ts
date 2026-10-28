import { SOCIAL_SANITY_TOKEN_ENC_KEY } from '$app/env/private';
import { decryptSecret, encryptSecret } from '../crypto.ts';
import { db } from '../db/index.ts';
import type { Account } from '../db/types.ts';
import type { ConnectedIdentity, Integration, IntegrationId, TokenGrant } from './types.ts';
import listSql from './sql/list-accounts.sql?raw';
import saveSql from './sql/save-account.sql?raw';
import saveRefreshedSql from './sql/save-refreshed-token.sql?raw';
import deleteSql from './sql/delete-account.sql?raw';

const listStatement = db.prepare<[], Account>(listSql);
const saveStatement = db.prepare(saveSql);
const saveRefreshedStatement = db.prepare(saveRefreshedSql);
const deleteStatement = db.prepare(deleteSql);

export function listAccounts(): Account[] {
	return listStatement.all();
}

export function getAccessToken(account: Account): string {
	return decryptSecret(account.accessTokenEnc, SOCIAL_SANITY_TOKEN_ENC_KEY);
}

export function getRefreshToken(account: Account): string | undefined {
	return account.refreshTokenEnc
		? decryptSecret(account.refreshTokenEnc, SOCIAL_SANITY_TOKEN_ENC_KEY)
		: undefined;
}

export function saveAccount(
	platform: IntegrationId,
	identity: ConnectedIdentity,
	now = Date.now()
) {
	saveStatement.run({
		platform,
		external_id: identity.externalId,
		display_name: identity.displayName,
		access_token_enc: encryptSecret(identity.accessToken, SOCIAL_SANITY_TOKEN_ENC_KEY),
		refresh_token_enc: identity.refreshToken
			? encryptSecret(identity.refreshToken, SOCIAL_SANITY_TOKEN_ENC_KEY)
			: null,
		expires_at: identity.expiresAt ?? null,
		scopes: identity.scopes.join(' '),
		now
	});
}

function saveRefreshedToken(account: Account, grant: TokenGrant, now = Date.now()) {
	saveRefreshedStatement.run({
		platform: account.platform,
		access_token_enc: encryptSecret(grant.accessToken, SOCIAL_SANITY_TOKEN_ENC_KEY),
		refresh_token_enc: grant.refreshToken
			? encryptSecret(grant.refreshToken, SOCIAL_SANITY_TOKEN_ENC_KEY)
			: null,
		expires_at: grant.expiresAt ?? null,
		refreshed_at: now
	});
}

export function deleteAccount(platform: string) {
	deleteStatement.run({ platform });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Refresh tokens that can be refreshed, are at least a day old, and expire within `windowDays`. */
export async function refreshExpiringTokens(
	integrations: Integration[],
	windowDays = 30,
	now = Date.now()
): Promise<{ platform: string; ok: boolean; error?: string }[]> {
	const results = [];
	for (const account of listAccounts()) {
		const integration = integrations.find((i) => i.id === account.platform);
		if (!integration?.refresh || account.expiresAt === null) continue;
		if (account.expiresAt <= now) continue; // expired tokens can't be refreshed; user must reconnect
		if (account.expiresAt - now > windowDays * DAY_MS || now - account.refreshedAt < DAY_MS)
			continue;
		try {
			const refreshToken = account.refreshTokenEnc
				? decryptSecret(account.refreshTokenEnc, SOCIAL_SANITY_TOKEN_ENC_KEY)
				: undefined;
			saveRefreshedToken(account, await integration.refresh(getAccessToken(account), refreshToken));
			results.push({ platform: account.platform, ok: true });
		} catch (error) {
			results.push({ platform: account.platform, ok: false, error: String(error) });
		}
	}
	return results;
}
