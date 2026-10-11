import { describe, expect, it } from 'vitest';
import { isValidMediaSignature, signMediaPath } from './signing.ts';

const SECRET = 's'.repeat(32);
const NOW = 1_800_000_000_000;

describe('media signing', () => {
	it('accepts a fresh signature for the same path', () => {
		const query = new URLSearchParams(signMediaPath(SECRET, 'a/b.jpg', NOW));
		expect(isValidMediaSignature(SECRET, 'a/b.jpg', query, NOW + 1000)).toBe(true);
	});

	it('rejects other paths, expired links, other secrets and tampering', () => {
		const query = new URLSearchParams(signMediaPath(SECRET, 'a/b.jpg', NOW, 1000));
		expect(isValidMediaSignature(SECRET, 'a/c.jpg', query, NOW)).toBe(false);
		expect(isValidMediaSignature(SECRET, 'a/b.jpg', query, NOW + 2000)).toBe(false);
		expect(isValidMediaSignature('t'.repeat(32), 'a/b.jpg', query, NOW)).toBe(false);
		query.set('expires', String(NOW + 999_999));
		expect(isValidMediaSignature(SECRET, 'a/b.jpg', query, NOW)).toBe(false);
		expect(isValidMediaSignature(SECRET, 'a/b.jpg', new URLSearchParams(), NOW)).toBe(false);
	});
});
