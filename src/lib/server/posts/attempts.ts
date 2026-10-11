import { and, eq } from 'drizzle-orm';
import type { PlatformId } from '#lib/format/index.ts';
import { db } from '../db/index.ts';
import { publishAttempts, type PublishAttempt } from '../db/schema.ts';

export function listAttempts(postId?: string): PublishAttempt[] {
	const query = db.select().from(publishAttempts);
	return postId ? query.where(eq(publishAttempts.postId, postId)).all() : query.all();
}

/** Marks the platform as publishing. Returns false while it is publishing or awaits recording. */
export function startAttempt(postId: string, platform: PlatformId, now = Date.now()): boolean {
	const existing = db
		.select()
		.from(publishAttempts)
		.where(and(eq(publishAttempts.postId, postId), eq(publishAttempts.platform, platform)))
		.get();
	if (existing && existing.status !== 'failed') return false;
	const row = { postId, platform, status: 'publishing' as const, error: null, updatedAt: now };
	db.insert(publishAttempts)
		.values(row)
		.onConflictDoUpdate({ target: [publishAttempts.postId, publishAttempts.platform], set: row })
		.run();
	return true;
}

export function failAttempt(postId: string, platform: PlatformId, error: string, now = Date.now()) {
	db.update(publishAttempts)
		.set({ status: 'failed', error, updatedAt: now })
		.where(and(eq(publishAttempts.postId, postId), eq(publishAttempts.platform, platform)))
		.run();
}

export function clearAttempt(postId: string, platform: PlatformId) {
	db.delete(publishAttempts)
		.where(and(eq(publishAttempts.postId, postId), eq(publishAttempts.platform, platform)))
		.run();
}

export function clearAttempts(postId: string) {
	db.delete(publishAttempts).where(eq(publishAttempts.postId, postId)).run();
}

/** Attempts left "publishing" by a restart can't be resumed; the platform may or may not have the post. */
export function failInterruptedAttempts(now = Date.now()) {
	db.update(publishAttempts)
		.set({
			status: 'failed',
			error:
				'Publishing was interrupted by a restart. Check the platform before trying again, or the post may appear twice.',
			updatedAt: now
		})
		.where(eq(publishAttempts.status, 'publishing'))
		.run();
}

/** The post is live on the platform, but writing that to the repository failed. */
export function markUnrecorded(
	postId: string,
	platform: PlatformId,
	result: { remoteId: string; remoteUrl: string | null; publishedAt: number },
	error: string,
	now = Date.now()
) {
	db.update(publishAttempts)
		.set({ status: 'unrecorded', ...result, error, updatedAt: now })
		.where(and(eq(publishAttempts.postId, postId), eq(publishAttempts.platform, platform)))
		.run();
}

export function listUnrecorded(): PublishAttempt[] {
	return db.select().from(publishAttempts).where(eq(publishAttempts.status, 'unrecorded')).all();
}
