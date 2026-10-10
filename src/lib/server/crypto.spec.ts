import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './crypto';

describe('encryptSecret / decryptSecret', () => {
	const key = randomBytes(32);

	it('round-trips a secret', () => {
		const token = 'AQX-oauth-token-🚀';
		expect(decryptSecret(encryptSecret(token, key), key)).toBe(token);
	});

	it('uses a fresh IV each time', () => {
		expect(encryptSecret('same', key)).not.toBe(encryptSecret('same', key));
	});

	it('rejects tampered ciphertext', () => {
		const data = Buffer.from(encryptSecret('secret', key), 'base64');
		data[data.length - 1] ^= 1;
		expect(() => decryptSecret(data.toString('base64'), key)).toThrow();
	});

	it('rejects the wrong key', () => {
		expect(() => decryptSecret(encryptSecret('secret', key), randomBytes(32))).toThrow();
	});
});
