import {
	expiresInToEpoch,
	readJson,
	type ConnectedIdentity,
	type Integration,
	type OAuthClientConfig
} from './types.ts';

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
export const LINKEDIN_SCOPES = ['openid', 'profile', 'w_member_social'];

/**
 * LinkedIn "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn".
 * Tokens last 60 days; refresh tokens are only issued to approved partners, so the user reconnects.
 */
export function createLinkedIn(config: OAuthClientConfig): Integration {
	return {
		id: 'linkedin',
		name: 'LinkedIn',
		consoleUrl: 'https://www.linkedin.com/developers/apps',
		setup: {
			createAppUrl: 'https://www.linkedin.com/developers/apps/new',
			steps: [
				'Create the app. LinkedIn asks for a Company Page to link it to; any page you administer works, and the app still posts as you.',
				'On the Products tab, request "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect".',
				'On the Auth tab, add the redirect URL below under "Authorized redirect URLs for your app".',
				'Copy the Client ID and the Primary Client Secret from the Auth tab into the form below.'
			],
			clientIdLabel: 'Client ID',
			clientSecretLabel: 'Primary Client Secret'
		},
		note: 'Add the "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" products to your app. Tokens last 60 days and must then be reconnected.',

		authorizeOrigin: new URL(AUTHORIZE_URL).origin,

		authorizeUrl(state, redirectUri) {
			const url = new URL(AUTHORIZE_URL);
			url.search = new URLSearchParams({
				response_type: 'code',
				client_id: config.clientId,
				redirect_uri: redirectUri,
				state,
				scope: LINKEDIN_SCOPES.join(' ')
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
				'LinkedIn token exchange'
			);
			const accessToken = token.access_token as string;

			const profile = await readJson(
				await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } }),
				'LinkedIn profile lookup'
			);

			return {
				accessToken,
				refreshToken: token.refresh_token as string | undefined,
				expiresAt: expiresInToEpoch(token.expires_in),
				scopes: String(token.scope ?? LINKEDIN_SCOPES.join(' '))
					.split(/[ ,]+/)
					.filter(Boolean),
				externalId: profile.sub as string,
				displayName: (profile.name as string) ?? 'LinkedIn member'
			};
		}
	};
}
