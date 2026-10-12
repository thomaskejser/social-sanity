import {
	expiresInToEpoch,
	readJson,
	type ConnectedIdentity,
	type Integration,
	type OAuthClientConfig,
	type TokenGrant
} from './types.ts';

const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_URL = 'https://graph.instagram.com';
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

/**
 * Instagram API with Instagram Login (Professional accounts only).
 * The code exchange yields a 1-hour token, which is swapped for a 60-day token that can be refreshed.
 */
export function createInstagram(config: OAuthClientConfig): Integration {
	async function exchangeForLongLived(shortLived: string): Promise<TokenGrant> {
		const url = new URL(`${GRAPH_URL}/access_token`);
		url.search = new URLSearchParams({
			grant_type: 'ig_exchange_token',
			client_secret: config.clientSecret,
			access_token: shortLived
		}).toString();
		const body = await readJson(await fetch(url), 'Instagram long-lived token exchange');
		return {
			accessToken: body.access_token as string,
			expiresAt: expiresInToEpoch(body.expires_in),
			scopes: INSTAGRAM_SCOPES
		};
	}

	return {
		id: 'instagram',
		name: 'Instagram',
		consoleUrl: 'https://developers.facebook.com/apps',
		setup: {
			createAppUrl: 'https://developers.facebook.com/apps/creation/',
			steps: [
				'Create the app and pick the use case for managing content on Instagram (the Instagram API).',
				'Under "API setup with Instagram login", add your Instagram Professional account as an Instagram tester, then accept the invite in Instagram.',
				'Under "Set up Instagram business login", add the redirect URL below to the OAuth redirect URIs.',
				'Copy the Instagram app ID and Instagram app secret from the same page into the form below. These differ from the Meta app ID at the top of the dashboard.'
			],
			clientIdLabel: 'Instagram app ID',
			clientSecretLabel: 'Instagram app secret'
		},
		note: 'Requires an Instagram Professional (Business or Creator) account added as a tester on your Meta app. Tokens are refreshed automatically.',

		authorizeOrigin: new URL(AUTHORIZE_URL).origin,

		authorizeUrl(state, redirectUri) {
			const url = new URL(AUTHORIZE_URL);
			url.search = new URLSearchParams({
				client_id: config.clientId,
				redirect_uri: redirectUri,
				response_type: 'code',
				scope: INSTAGRAM_SCOPES.join(','),
				state
			}).toString();
			return url.toString();
		},

		async exchangeCode(code, redirectUri): Promise<ConnectedIdentity> {
			const body = await readJson(
				await fetch(TOKEN_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						client_id: config.clientId,
						client_secret: config.clientSecret,
						grant_type: 'authorization_code',
						redirect_uri: redirectUri,
						// Instagram appends "#_" to the code in the redirect.
						code: code.replace(/#_$/, '')
					})
				}),
				'Instagram token exchange'
			);
			// The response is either flat or wrapped in a `data` array depending on API version.
			const grant = (Array.isArray(body.data) ? body.data[0] : body) as Record<string, unknown>;
			const longLived = await exchangeForLongLived(grant.access_token as string);

			const meUrl = new URL(`${GRAPH_URL}/me`);
			meUrl.search = new URLSearchParams({
				fields: 'user_id,username',
				access_token: longLived.accessToken
			}).toString();
			const me = await readJson(await fetch(meUrl), 'Instagram profile lookup');

			const permissions = grant.permissions;
			return {
				...longLived,
				scopes: Array.isArray(permissions)
					? (permissions as string[])
					: typeof permissions === 'string'
						? permissions.split(',')
						: INSTAGRAM_SCOPES,
				externalId: String(me.user_id ?? grant.user_id),
				displayName: me.username ? `@${me.username}` : 'Instagram account'
			};
		},

		async refresh(accessToken) {
			const url = new URL(`${GRAPH_URL}/refresh_access_token`);
			url.search = new URLSearchParams({
				grant_type: 'ig_refresh_token',
				access_token: accessToken
			}).toString();
			const body = await readJson(await fetch(url), 'Instagram token refresh');
			return {
				accessToken: body.access_token as string,
				expiresAt: expiresInToEpoch(body.expires_in),
				scopes: INSTAGRAM_SCOPES
			};
		}
	};
}
