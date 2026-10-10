import { describe, expect, it } from 'vitest';
import { createSessionToken, isValidSessionToken, SESSION_MAX_AGE_SECONDS } from './session';

const SECRET = 'a'.repeat(32);
const NOW = 1_700_000_000_000;

describe('session tokens', () => {
	const token = createSessionToken(SECRET, NOW);

	it('accepts a fresh token', () => {
		expect(isValidSessionToken(token, SECRET, NOW + 1000)).toBe(true);
	});

	it('rejects an expired token', () => {
		expect(isValidSessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS * 1000 + 1)).toBe(
			false
		);
	});

	it('rejects a token signed with another secret', () => {
		expect(isValidSessionToken(token, 'b'.repeat(32), NOW)).toBe(false);
	});

	it('rejects a token with a forged expiry', () => {
		const [, signature] = token.split('.');
		expect(isValidSessionToken(`${NOW * 2}.${signature}`, SECRET, NOW)).toBe(false);
	});

	it('rejects missing or malformed tokens', () => {
		expect(isValidSessionToken(undefined, SECRET, NOW)).toBe(false);
		expect(isValidSessionToken('garbage', SECRET, NOW)).toBe(false);
	});
});
