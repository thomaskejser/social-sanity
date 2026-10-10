import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstagram } from './instagram';

const config = { clientId: 'ig-id', clientSecret: 'ig-secret' };
const REDIRECT = 'https://app.test/integrations/instagram/callback';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

afterEach(() => vi.unstubAllGlobals());

describe('Instagram integration', () => {
	const instagram = createInstagram(config);

	it('builds the authorization URL with comma-separated scopes', () => {
		const url = new URL(instagram.authorizeUrl('instagram.xyz', REDIRECT));
		expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
		expect(url.searchParams.get('scope')).toBe(
			'instagram_business_basic,instagram_business_content_publish'
		);
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('state')).toBe('instagram.xyz');
	});

	it('exchanges the code, upgrades to a long-lived token and fetches the username', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				json({
					data: [
						{
							access_token: 'short',
							user_id: '42',
							permissions: 'instagram_business_basic,instagram_business_content_publish'
						}
					]
				})
			)
			.mockResolvedValueOnce(
				json({ access_token: 'long', token_type: 'bearer', expires_in: 5183944 })
			)
			.mockResolvedValueOnce(json({ user_id: '1789', username: 'ada' }));
		vi.stubGlobal('fetch', fetchMock);

		const identity = await instagram.exchangeCode('code123#_', REDIRECT);

		const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
		expect(tokenUrl).toBe('https://api.instagram.com/oauth/access_token');
		expect((tokenInit.body as URLSearchParams).get('code')).toBe('code123');

		const longLivedUrl = new URL(fetchMock.mock.calls[1][0]);
		expect(longLivedUrl.pathname).toBe('/access_token');
		expect(longLivedUrl.searchParams.get('grant_type')).toBe('ig_exchange_token');
		expect(longLivedUrl.searchParams.get('access_token')).toBe('short');

		expect(new URL(fetchMock.mock.calls[2][0]).searchParams.get('access_token')).toBe('long');

		expect(identity).toMatchObject({
			accessToken: 'long',
			externalId: '1789',
			displayName: '@ada',
			scopes: ['instagram_business_basic', 'instagram_business_content_publish']
		});
	});

	it('refreshes a long-lived token', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				json({ access_token: 'renewed', token_type: 'bearer', expires_in: 5184000 })
			);
		vi.stubGlobal('fetch', fetchMock);

		const grant = await instagram.refresh!('long');
		const url = new URL(fetchMock.mock.calls[0][0]);
		expect(url.pathname).toBe('/refresh_access_token');
		expect(url.searchParams.get('grant_type')).toBe('ig_refresh_token');
		expect(grant.accessToken).toBe('renewed');
	});
});
