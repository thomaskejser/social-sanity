import { randomBytes, timingSafeEqual } from 'node:crypto';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

/** A random CSRF state bound to the platform it was issued for: `<platform>.<nonce>`. */
export function createOAuthState(platform: string): string {
	return `${platform}.${randomBytes(24).toString('base64url')}`;
}

export function isValidOAuthState(
	platform: string,
	received: string | null,
	stored: string | undefined
): boolean {
	if (!received || !stored || !stored.startsWith(`${platform}.`)) return false;
	const a = Buffer.from(received);
	const b = Buffer.from(stored);
	return a.length === b.length && timingSafeEqual(a, b);
}
