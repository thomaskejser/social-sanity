import type { PlatformId } from '#lib/format/index.ts';
import { db } from '../db/index.ts';
import type { PublishAttempt } from '../db/types.ts';
import listSql from './sql/list-attempts.sql?raw';
import listUnrecordedSql from './sql/list-unrecorded.sql?raw';
import startSql from './sql/start-attempt.sql?raw';
import failSql from './sql/fail-attempt.sql?raw';
import failInterruptedSql from './sql/fail-interrupted-attempts.sql?raw';
import markUnrecordedSql from './sql/mark-unrecorded.sql?raw';
import clearSql from './sql/clear-attempt.sql?raw';
import clearAllSql from './sql/clear-attempts.sql?raw';

const listStatement = db.prepare<[{ post_id: string | null }], PublishAttempt>(listSql);
const listUnrecordedStatement = db.prepare<[], PublishAttempt>(listUnrecordedSql);
const startStatement = db.prepare(startSql);
const failStatement = db.prepare(failSql);
const failInterruptedStatement = db.prepare(failInterruptedSql);
const markUnrecordedStatement = db.prepare(markUnrecordedSql);
const clearStatement = db.prepare(clearSql);
const clearAllStatement = db.prepare(clearAllSql);

export function listAttempts(postId?: string): PublishAttempt[] {
	return listStatement.all({ post_id: postId ?? null });
}

/** Marks the platform as publishing. Returns false while it is publishing or awaits recording. */
export function startAttempt(postId: string, platform: PlatformId, now = Date.now()): boolean {
	return startStatement.run({ post_id: postId, platform, updated_at: now }).changes > 0;
}

export function failAttempt(postId: string, platform: PlatformId, error: string, now = Date.now()) {
	failStatement.run({ post_id: postId, platform, error, updated_at: now });
}

export function clearAttempt(postId: string, platform: PlatformId) {
	clearStatement.run({ post_id: postId, platform });
}

export function clearAttempts(postId: string) {
	clearAllStatement.run({ post_id: postId });
}

export function failInterruptedAttempts(now = Date.now()) {
	failInterruptedStatement.run({ updated_at: now });
}

/** The post is live on the platform, but writing that to the repository failed. */
export function markUnrecorded(
	postId: string,
	platform: PlatformId,
	result: { remoteId: string; remoteUrl: string | null; publishedAt: number },
	error: string,
	now = Date.now()
) {
	markUnrecordedStatement.run({
		post_id: postId,
		platform,
		remote_id: result.remoteId,
		remote_url: result.remoteUrl,
		published_at: result.publishedAt,
		error,
		updated_at: now
	});
}

export function listUnrecorded(): PublishAttempt[] {
	return listUnrecordedStatement.all();
}
