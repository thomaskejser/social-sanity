export type PlatformId = 'linkedin' | 'instagram';

export type OAuthClientConfig = {
	clientId: string;
	clientSecret: string;
};

/** What a successful OAuth exchange (or refresh) yields. */
export type TokenGrant = {
	accessToken: string;
	refreshToken?: string;
	/** Epoch milliseconds. */
	expiresAt?: number;
	scopes: string[];
};

export type ConnectedIdentity = TokenGrant & {
	externalId: string;
	displayName: string;
};

/** How to create the developer app the OAuth flow runs through. */
export type AppSetup = {
	/** Page in the developer console that starts creating a new app. */
	createAppUrl: string;
	/** Steps in the console, in order. The redirect URI is shown next to them. */
	steps: string[];
	clientIdLabel: string;
	clientSecretLabel: string;
};

export interface Integration {
	id: PlatformId;
	name: string;
	/** Developer console where the OAuth app (and its redirect URI) is registered. */
	consoleUrl: string;
	setup: AppSetup;
	/** Short note shown on the integrations page, e.g. account-type requirements. */
	note?: string;
	/** Origin of the OAuth consent page; the only external origin we redirect to. */
	authorizeOrigin: string;
	authorizeUrl(state: string, redirectUri: string): string;
	exchangeCode(code: string, redirectUri: string): Promise<ConnectedIdentity>;
	/** Present only when the platform lets us renew tokens without user interaction. */
	refresh?(accessToken: string, refreshToken?: string): Promise<TokenGrant>;
}

export class IntegrationError extends Error {}

export async function readJson(response: Response, what: string): Promise<Record<string, unknown>> {
	const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	if (!response.ok) {
		const detail =
			(body.error_description as string) ??
			(body.error_message as string) ??
			(typeof body.error === 'object'
				? ((body.error as Record<string, unknown>).message as string)
				: (body.error as string)) ??
			(body.message as string) ??
			response.statusText;
		throw new IntegrationError(`${what} failed (${response.status}): ${detail}`);
	}
	return body;
}

export function expiresInToEpoch(expiresIn: unknown, now = Date.now()): number | undefined {
	return typeof expiresIn === 'number' ? now + expiresIn * 1000 : undefined;
}
