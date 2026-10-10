import { eq } from 'drizzle-orm';
import { TOKEN_ENC_KEY } from '$app/env/private';
import { decryptSecret, encryptSecret } from '../crypto.ts';
import { db } from '../db/index.ts';
import { accounts, type Account } from '../db/schema.ts';
import type { ConnectedIdentity, Integration, PlatformId, TokenGrant } from './types.ts';

export function listAccounts(): Account[] {
	return db.select().from(accounts).all();
}

export function getAccessToken(account: Account): string {
	return decryptSecret(account.accessTokenEnc, TOKEN_ENC_KEY);
}

export function saveAccount(platform: PlatformId, identity: ConnectedIdentity, now = Date.now()) {
	const row = {
		platform,
		externalId: identity.externalId,
		displayName: identity.displayName,
		accessTokenEnc: encryptSecret(identity.accessToken, TOKEN_ENC_KEY),
		refreshTokenEnc: identity.refreshToken
			? encryptSecret(identity.refreshToken, TOKEN_ENC_KEY)
			: null,
		expiresAt: identity.expiresAt ?? null,
		scopes: identity.scopes.join(' '),
		connectedAt: now,
		refreshedAt: now
	};
	db.insert(accounts).values(row).onConflictDoUpdate({ target: accounts.platform, set: row }).run();
}

function saveRefreshedToken(account: Account, grant: TokenGrant, now = Date.now()) {
	db.update(accounts)
		.set({
			accessTokenEnc: encryptSecret(grant.accessToken, TOKEN_ENC_KEY),
			refreshTokenEnc: grant.refreshToken
				? encryptSecret(grant.refreshToken, TOKEN_ENC_KEY)
				: account.refreshTokenEnc,
			expiresAt: grant.expiresAt ?? account.expiresAt,
			refreshedAt: now
		})
		.where(eq(accounts.platform, account.platform))
		.run();
}

export function deleteAccount(platform: string) {
	db.delete(accounts).where(eq(accounts.platform, platform)).run();
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
				? decryptSecret(account.refreshTokenEnc, TOKEN_ENC_KEY)
				: undefined;
			saveRefreshedToken(account, await integration.refresh(getAccessToken(account), refreshToken));
			results.push({ platform: account.platform, ok: true });
		} catch (error) {
			results.push({ platform: account.platform, ok: false, error: String(error) });
		}
	}
	return results;
}
