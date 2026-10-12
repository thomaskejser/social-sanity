import { describe, expect, it } from 'vitest';
import { parseOAuthClientForm } from './client-form.ts';

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
};

describe('parseOAuthClientForm', () => {
	it('accepts and trims pasted credentials', () => {
		expect(
			parseOAuthClientForm(form({ clientId: ' 86abc123 ', clientSecret: 'WPL_AP1.xyz==\n' }))
		).toEqual({
			ok: true,
			config: { clientId: '86abc123', clientSecret: 'WPL_AP1.xyz==' }
		});
	});

	it('requires both values and keeps only the client ID for redisplay', () => {
		const result = parseOAuthClientForm(form({ clientId: '86abc123' }));
		expect(result).toEqual({
			ok: false,
			values: { clientId: '86abc123' },
			errors: { clientSecret: expect.stringMatching(/Paste/) }
		});
	});

	it('rejects values that are not opaque tokens', () => {
		const result = parseOAuthClientForm(form({ clientId: 'my app id', clientSecret: 'a<b>c d' }));
		expect(result.ok ? null : result.errors).toEqual({
			clientId: expect.any(String),
			clientSecret: expect.any(String)
		});
	});
});
