import { getRefreshToken, listAccounts } from './accounts.ts';
import { getOAuthClient } from './clients.ts';
import {
	expiresInToEpoch,
	IntegrationError,
	readJson,
	type ConnectedIdentity,
	type Integration,
	type IntegrationId,
	type OAuthClientConfig,
	type TokenGrant
} from './types.ts';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const IDENTITY_SCOPES = ['openid', 'email', 'profile'];

type GoogleService = {
	id: IntegrationId;
	name: string;
	/** The API to enable in the Cloud project, e.g. "People API". */
	api: string;
	/** Read-only scopes of the service, on top of the sign-in scopes. */
	scopes: string[];
};

/**
 * A read-only Google service. Access tokens last an hour, so the stored connection has no expiry:
 * every use exchanges the refresh token for a fresh access token (see `googleAccessToken`).
 * Contacts and YouTube can share one Cloud project and OAuth client.
 */
function createGoogleService(service: GoogleService, config: OAuthClientConfig): Integration {
	const scopes = [...IDENTITY_SCOPES, ...service.scopes];
	return {
		id: service.id,
		name: service.name,
		family: { id: 'google', api: service.api },
		consoleUrl: 'https://console.cloud.google.com/apis/credentials',
		setup: {
			createAppUrl: 'https://console.cloud.google.com/projectcreate',
			steps: [
				`Create a Google Cloud project, or reuse the one for another Google integration, and enable the "${service.api}" for it under APIs & Services → Library.`,
				'Under APIs & Services → OAuth consent screen, choose "External", fill in the app name and your e-mail, and add your Google account as a test user.',
				'Under APIs & Services → Credentials, create an "OAuth client ID" of type "Web application" (or open the existing one) and add the redirect URL below under "Authorized redirect URIs".',
				'Copy the Client ID and Client secret into the form below. Google shows the secret only once, right after creating the client; if you missed it, open the client and choose "Add secret" to make a new one.'
			],
			clientIdLabel: 'Client ID',
			clientSecretLabel: 'Client secret'
		},
		note: 'Read-only. While the consent screen is in "Testing", Google ends the connection after 7 days; publish the app (no verification needed for your own account) to keep it.',

		authorizeOrigin: new URL(AUTHORIZE_URL).origin,

		authorizeUrl(state, redirectUri) {
			const url = new URL(AUTHORIZE_URL);
			url.search = new URLSearchParams({
				response_type: 'code',
				client_id: config.clientId,
				redirect_uri: redirectUri,
				state,
				scope: scopes.join(' '),
				access_type: 'offline',
				prompt: 'consent'
			}).toString();
			return url.toString();
		},

		async exchangeCode(code, redirectUri): Promise<ConnectedIdentity> {
			const token = await readJson(
				await fetch(TOKEN_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						grant_type: 'authorization_code',
						code,
						redirect_uri: redirectUri,
						client_id: config.clientId,
						client_secret: config.clientSecret
					})
				}),
				`${service.name} token exchange`
			);
			const accessToken = token.access_token as string;
			const refreshToken = token.refresh_token as string | undefined;
			if (!refreshToken) {
				throw new IntegrationError(
					'Google did not return a refresh token. Remove Social Sanity under "Third-party apps" in your Google account and connect again.'
				);
			}

			const profile = await readJson(
				await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } }),
				'Google profile lookup'
			);

			return {
				accessToken,
				refreshToken,
				scopes: String(token.scope ?? scopes.join(' '))
					.split(' ')
					.filter(Boolean),
				externalId: profile.sub as string,
				displayName: (profile.email as string) ?? (profile.name as string) ?? 'Google account'
			};
		}
	};
}

export function createGoogle(config: OAuthClientConfig): Integration {
	return createGoogleService(
		{
			id: 'google',
			name: 'Google Contacts',
			api: 'People API',
			scopes: ['https://www.googleapis.com/auth/contacts.readonly']
		},
		config
	);
}

export function createYouTube(config: OAuthClientConfig): Integration {
	return createGoogleService(
		{
			id: 'youtube',
			name: 'YouTube',
			api: 'YouTube Data API v3',
			scopes: ['https://www.googleapis.com/auth/youtube.readonly']
		},
		config
	);
}

/** A fresh access token for a connected Google service; fails with how to fix it. */
export async function googleAccessToken(id: IntegrationId, name: string): Promise<string> {
	const account = listAccounts().find((a) => a.platform === id);
	const client = getOAuthClient(id);
	const refreshToken = account && getRefreshToken(account);
	if (!account || !client || !refreshToken)
		throw new IntegrationError(`Connect ${name} on the Integrations page first.`);
	try {
		return (await refreshGoogleToken(client, refreshToken)).accessToken;
	} catch (error) {
		throw new IntegrationError(
			`${error instanceof Error ? error.message : String(error)}. Reconnect ${name} on the Integrations page.`
		);
	}
}

export async function refreshGoogleToken(
	config: OAuthClientConfig,
	refreshToken: string
): Promise<TokenGrant> {
	const token = await readJson(
		await fetch(TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
				client_id: config.clientId,
				client_secret: config.clientSecret
			})
		}),
		'Google token refresh'
	);
	return {
		accessToken: token.access_token as string,
		expiresAt: expiresInToEpoch(token.expires_in),
		scopes: String(token.scope ?? '')
			.split(' ')
			.filter(Boolean)
	};
}
