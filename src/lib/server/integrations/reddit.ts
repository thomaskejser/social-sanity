import { getRefreshToken, listAccounts } from './accounts.ts';
import { getOAuthClient } from './clients.ts';
import {
	expiresInToEpoch,
	IntegrationError,
	readJson,
	type ConnectedIdentity,
	type Integration,
	type OAuthClientConfig
} from './types.ts';

const AUTHORIZE_URL = 'https://www.reddit.com/api/v1/authorize';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
export const REDDIT_API = 'https://oauth.reddit.com';
const SCOPES = ['identity', 'mysubreddits', 'read', 'history'];
/** Reddit blocks API requests without a descriptive User-Agent. */
export const REDDIT_USER_AGENT = 'web:social-sanity:1.0 (personal feed reader)';

function basicAuth(config: OAuthClientConfig): string {
	return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
}

async function requestToken(config: OAuthClientConfig, body: Record<string, string>, what: string) {
	return readJson(
		await fetch(TOKEN_URL, {
			method: 'POST',
			headers: {
				Authorization: basicAuth(config),
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': REDDIT_USER_AGENT
			},
			body: new URLSearchParams(body)
		}),
		what
	);
}

/**
 * Read-only Reddit access: the subreddits and people the account follows, and their posts.
 * Access tokens last a day, so the stored connection has no expiry: every use exchanges the
 * permanent refresh token for a fresh access token (see `redditAccessToken`).
 */
export function createReddit(config: OAuthClientConfig): Integration {
	return {
		id: 'reddit',
		name: 'Reddit',
		consoleUrl: 'https://www.reddit.com/prefs/apps',
		setup: {
			createAppUrl: 'https://www.reddit.com/prefs/apps',
			steps: [
				'Sign in to Reddit and choose "create another app…" at the bottom of the page.',
				'Give it a name, choose "web app", and enter the redirect URL below as the "redirect uri".',
				'Copy the client ID (the code under "web app", below the app name) and the secret into the form below.'
			],
			clientIdLabel: 'Client ID',
			clientSecretLabel: 'Secret'
		},
		note: 'Read-only. Imports the subreddits and people you follow as channels and humans, and reads their posts into the Consume feed.',

		authorizeOrigin: new URL(AUTHORIZE_URL).origin,

		authorizeUrl(state, redirectUri) {
			const url = new URL(AUTHORIZE_URL);
			url.search = new URLSearchParams({
				response_type: 'code',
				client_id: config.clientId,
				redirect_uri: redirectUri,
				state,
				duration: 'permanent',
				scope: SCOPES.join(' ')
			}).toString();
			return url.toString();
		},

		async exchangeCode(code, redirectUri): Promise<ConnectedIdentity> {
			const token = await requestToken(
				config,
				{ grant_type: 'authorization_code', code, redirect_uri: redirectUri },
				'Reddit token exchange'
			);
			const accessToken = token.access_token as string;
			const refreshToken = token.refresh_token as string | undefined;
			if (!refreshToken)
				throw new IntegrationError('Reddit did not return a refresh token. Connect again.');

			const me = await readJson(
				await fetch(`${REDDIT_API}/api/v1/me`, {
					headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': REDDIT_USER_AGENT }
				}),
				'Reddit profile lookup'
			);
			return {
				accessToken,
				refreshToken,
				scopes: String(token.scope ?? SCOPES.join(' '))
					.split(/[ ,]+/)
					.filter(Boolean),
				externalId: String(me.id ?? me.name),
				displayName: me.name ? `u/${me.name as string}` : 'Reddit account'
			};
		}
	};
}

export function isRedditConnected(): boolean {
	return listAccounts().some((a) => a.platform === 'reddit') && !!getOAuthClient('reddit');
}

let cached: { refreshToken: string; accessToken: string; expiresAt: number } | null = null;

/** A fresh access token for the connected Reddit account; fails with how to fix it. */
export async function redditAccessToken(now = Date.now()): Promise<string> {
	const account = listAccounts().find((a) => a.platform === 'reddit');
	const client = getOAuthClient('reddit');
	const refreshToken = account && getRefreshToken(account);
	if (!account || !client || !refreshToken)
		throw new IntegrationError('Connect Reddit on the Integrations page first.');
	if (cached?.refreshToken === refreshToken && cached.expiresAt > now) return cached.accessToken;
	try {
		const token = await requestToken(
			client,
			{ grant_type: 'refresh_token', refresh_token: refreshToken },
			'Reddit token refresh'
		);
		const accessToken = token.access_token as string;
		const expiresAt = (expiresInToEpoch(token.expires_in, now) ?? now + 3_600_000) - 60_000;
		cached = { refreshToken, accessToken, expiresAt };
		return accessToken;
	} catch (error) {
		throw new IntegrationError(
			`${error instanceof Error ? error.message : String(error)}. Reconnect Reddit on the Integrations page.`
		);
	}
}

/** Reddit allows 100 requests a minute per client. */
const REQUEST_GAP_MS = 700;
let nextRequestAt = 0;

async function paceRequests() {
	const wait = nextRequestAt - Date.now();
	nextRequestAt = Math.max(nextRequestAt, Date.now()) + REQUEST_GAP_MS;
	if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/** Reads a Reddit API path, e.g. `/subreddits/mine/subscriber`, as the connected account. */
export async function redditGet(
	path: string,
	params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
	const url = new URL(path, REDDIT_API);
	url.search = new URLSearchParams({ raw_json: '1', ...params }).toString();
	const token = await redditAccessToken();
	await paceRequests();
	return readJson(
		await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				'User-Agent': REDDIT_USER_AGENT
			},
			signal: AbortSignal.timeout(15_000)
		}),
		'Reddit'
	);
}
