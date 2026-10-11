import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_MS = 60 * 60 * 1000;

function signature(secret: string, mediaPath: string, expires: number): string {
	return createHmac('sha256', secret).update(`media:${mediaPath}:${expires}`).digest('base64url');
}

/** Query string that lets anyone fetch `mediaPath` until it expires (for Instagram's fetcher). */
export function signMediaPath(
	secret: string,
	mediaPath: string,
	now = Date.now(),
	ttlMs = DEFAULT_TTL_MS
): string {
	const expires = now + ttlMs;
	return new URLSearchParams({
		expires: String(expires),
		sig: signature(secret, mediaPath, expires)
	}).toString();
}

export function isValidMediaSignature(
	secret: string,
	mediaPath: string,
	params: URLSearchParams,
	now = Date.now()
): boolean {
	const expires = Number(params.get('expires'));
	const given = params.get('sig');
	if (!Number.isFinite(expires) || expires < now || !given) return false;
	const expected = Buffer.from(signature(secret, mediaPath, expires));
	const actual = Buffer.from(given);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}
