import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Encrypts a secret (e.g. an OAuth token) into a base64 string of iv | tag | ciphertext. */
export function encryptSecret(plaintext: string, key: Buffer): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decryptSecret(encoded: string, key: Buffer): string {
	const data = Buffer.from(encoded, 'base64');
	const iv = data.subarray(0, IV_BYTES);
	const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
	const ciphertext = data.subarray(IV_BYTES + TAG_BYTES);
	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
