import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	const hash = hashPassword('correct horse');

	it('produces an scrypt hash', () => {
		expect(hash).toMatch(/^scrypt:[^:]+:[^:]+$/);
	});

	it('verifies the right password', () => {
		expect(verifyPassword('correct horse', hash)).toBe(true);
	});

	it('rejects the wrong password', () => {
		expect(verifyPassword('battery staple', hash)).toBe(false);
	});

	it('rejects malformed hashes', () => {
		expect(verifyPassword('correct horse', 'plain-text')).toBe(false);
	});
});
