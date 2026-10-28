import { describe, expect, it, vi } from 'vitest';
import { fetchMediumUser, MediumError } from './medium.ts';

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchMediumUser', () => {
	it('returns the user the token belongs to', async () => {
		const fetch = vi.fn(async () =>
			json({
				data: { id: 'u1', username: 'jane', name: 'Jane', url: 'https://medium.com/@jane' }
			})
		);
		await expect(fetchMediumUser('tok', fetch)).resolves.toEqual({
			id: 'u1',
			username: 'jane',
			name: 'Jane',
			url: 'https://medium.com/@jane'
		});
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.medium.com/v1/me');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
	});

	it('reports a rejected token', async () => {
		const fetch = vi.fn(async () => json({ errors: [] }, 401));
		await expect(fetchMediumUser('tok', fetch)).rejects.toThrow('Medium rejected the token');
	});

	it('reports other failures with the status', async () => {
		const fetch = vi.fn(async () => json({}, 503));
		await expect(fetchMediumUser('tok', fetch)).rejects.toThrow('Medium answered 503');
	});

	it('rejects an answer without a user', async () => {
		const fetch = vi.fn(async () => json({ data: {} }));
		await expect(fetchMediumUser('tok', fetch)).rejects.toBeInstanceOf(MediumError);
	});

	it('reports a network failure', async () => {
		const fetch = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});
		await expect(fetchMediumUser('tok', fetch)).rejects.toThrow('Could not reach Medium');
	});
});
