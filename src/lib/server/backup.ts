import { timingSafeEqual } from 'node:crypto';
import { db } from './db/index.ts';

/**
 * A consistent copy of the whole database, taken while the app keeps running. Tokens and client
 * secrets in it stay encrypted with SOCIAL_SANITY_TOKEN_ENC_KEY, which is not part of the copy.
 */
export function databaseSnapshot(now = new Date()): Response {
	const filename = `social-sanity-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.db`;
	return new Response(new Uint8Array(db.serialize()), {
		headers: {
			'Content-Type': 'application/vnd.sqlite3',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store'
		}
	});
}

/** Whether an `Authorization: Bearer …` header carries the backup token. */
export function isBackupAuthorized(header: string | null, token: string): boolean {
	const presented = Buffer.from(header?.replace(/^Bearer\s+/i, '') ?? '');
	const expected = Buffer.from(token);
	return presented.length === expected.length && timingSafeEqual(presented, expected);
}
