import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLinkedIn } from './linkedin';
import { IntegrationError } from './types';

const config = { clientId: 'li-id', clientSecret: 'li-secret' };
const REDIRECT = 'https://app.test/integrations/linkedin/callback';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

afterEach(() => vi.unstubAllGlobals());

describe('LinkedIn integration', () => {
	const linkedin = createLinkedIn(config);

	it('builds the authorization URL', () => {
		const url = new URL(linkedin.authorizeUrl('linkedin.abc', REDIRECT));
		expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			response_type: 'code',
			client_id: 'li-id',
			redirect_uri: REDIRECT,
			state: 'linkedin.abc',
			scope: 'openid profile w_member_social'
		});
	});

	it('exchanges the code and looks up the member', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				json({ access_token: 'tok', expires_in: 5184000, scope: 'openid,profile,w_member_social' })
			)
			.mockResolvedValueOnce(json({ sub: 'abc123', name: 'Ada Lovelace' }));
		vi.stubGlobal('fetch', fetchMock);

		const before = Date.now();
		const identity = await linkedin.exchangeCode('the-code', REDIRECT);

		const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
		expect(tokenUrl).toBe('https://www.linkedin.com/oauth/v2/accessToken');
		expect(Object.fromEntries(tokenInit.body as URLSearchParams)).toEqual({
			grant_type: 'authorization_code',
			code: 'the-code',
			redirect_uri: REDIRECT,
			client_id: 'li-id',
			client_secret: 'li-secret'
		});
		expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer tok' });

		expect(identity).toMatchObject({
			accessToken: 'tok',
			externalId: 'abc123',
			displayName: 'Ada Lovelace',
			scopes: ['openid', 'profile', 'w_member_social']
		});
		expect(identity.expiresAt).toBeGreaterThanOrEqual(before + 5184000 * 1000);
	});

	it('surfaces OAuth errors', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => json({ error: 'invalid_grant', error_description: 'Code expired' }, 400))
		);
		await expect(linkedin.exchangeCode('bad', REDIRECT)).rejects.toThrow(IntegrationError);
		await expect(linkedin.exchangeCode('bad', REDIRECT)).rejects.toThrow(/Code expired/);
	});

	it('cannot refresh (non-partner apps)', () => {
		expect(linkedin.refresh).toBeUndefined();
	});
});
