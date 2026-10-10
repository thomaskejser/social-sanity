import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Creates a stateless session token `<expiresAtMs>.<signature>`. Single user, so no user id is needed. */
export function createSessionToken(secret: string, now = Date.now()): string {
	const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
	return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function isValidSessionToken(
	token: string | undefined,
	secret: string,
	now = Date.now()
): boolean {
	if (!token) return false;
	const [expiresAt, signature] = token.split('.');
	if (!expiresAt || !signature) return false;
	const expected = Buffer.from(sign(expiresAt, secret));
	const actual = Buffer.from(signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
	return Number(expiresAt) > now;
}
