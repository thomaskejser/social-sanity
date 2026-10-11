import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { PLATFORMS, type PlatformId } from '#lib/format/index.ts';
import { db } from '../db/index.ts';
import {
	postMedia,
	posts,
	postTargets,
	type Post,
	type PostMedia,
	type PostTarget
} from '../db/schema.ts';
import type { StoredMedia } from '../media/store.ts';

export type PostWithParts = Post & { media: PostMedia[]; targets: PostTarget[] };

/** Creates a post with its media and one target per platform, holding that platform's text. */
export function createPost(text: string, media: StoredMedia[], now = Date.now()): number {
	return db.transaction((tx) => {
		const { id } = tx
			.insert(posts)
			.values({ text, createdAt: now, updatedAt: now })
			.returning({ id: posts.id })
			.get();
		if (media.length > 0) {
			tx.insert(postMedia)
				.values(media.map((item, position) => ({ ...item, postId: id, position })))
				.run();
		}
		tx.insert(postTargets)
			.values(
				PLATFORMS.map((platform) => ({
					postId: id,
					platform: platform.id,
					text: platform.format(text),
					updatedAt: now
				}))
			)
			.run();
		return id;
	});
}

export function getPost(id: number): PostWithParts | undefined {
	const post = db.select().from(posts).where(eq(posts.id, id)).get();
	if (!post) return undefined;
	const media = db
		.select()
		.from(postMedia)
		.where(eq(postMedia.postId, id))
		.orderBy(asc(postMedia.position))
		.all();
	const targets = db.select().from(postTargets).where(eq(postTargets.postId, id)).all();
	return { ...post, media, targets };
}

export function listPosts(): (Post & { targets: PostTarget[]; mediaCount: number })[] {
	const all = db.select().from(posts).orderBy(desc(posts.createdAt)).all();
	if (all.length === 0) return [];
	const ids = all.map((p) => p.id);
	const targets = db.select().from(postTargets).where(inArray(postTargets.postId, ids)).all();
	const media = db
		.select({ postId: postMedia.postId })
		.from(postMedia)
		.where(inArray(postMedia.postId, ids))
		.all();
	return all.map((post) => ({
		...post,
		targets: targets.filter((t) => t.postId === post.id),
		mediaCount: media.filter((m) => m.postId === post.id).length
	}));
}

/** Saves edited per-platform texts. Published targets keep the text they were published with. */
export function saveTargetTexts(
	postId: number,
	texts: Partial<Record<PlatformId, string>>,
	now = Date.now()
) {
	db.transaction((tx) => {
		for (const [platform, text] of Object.entries(texts)) {
			tx.update(postTargets)
				.set({ text, updatedAt: now })
				.where(
					and(
						eq(postTargets.postId, postId),
						eq(postTargets.platform, platform),
						inArray(postTargets.status, ['draft', 'failed'])
					)
				)
				.run();
		}
	});
}

/** Marks targets as publishing, unless they already are or are published. Returns those marked. */
export function claimTargets(postId: number, platforms: PlatformId[], now = Date.now()) {
	return db
		.update(postTargets)
		.set({ status: 'publishing', error: null, updatedAt: now })
		.where(
			and(
				eq(postTargets.postId, postId),
				inArray(postTargets.platform, platforms),
				inArray(postTargets.status, ['draft', 'failed'])
			)
		)
		.returning()
		.all();
}

export function markPublished(
	postId: number,
	platform: PlatformId,
	remote: { remoteId: string; remoteUrl: string | null },
	now = Date.now()
) {
	db.update(postTargets)
		.set({ status: 'published', ...remote, error: null, publishedAt: now, updatedAt: now })
		.where(and(eq(postTargets.postId, postId), eq(postTargets.platform, platform)))
		.run();
}

export function markFailed(postId: number, platform: PlatformId, error: string, now = Date.now()) {
	db.update(postTargets)
		.set({ status: 'failed', error, updatedAt: now })
		.where(and(eq(postTargets.postId, postId), eq(postTargets.platform, platform)))
		.run();
}

/** Targets left in "publishing" by a restart can't be resumed; the platform may or may not have the post. */
export function failInterruptedPublishing(now = Date.now()) {
	db.update(postTargets)
		.set({
			status: 'failed',
			error:
				'Publishing was interrupted by a restart. Check the platform before trying again, or the post may appear twice.',
			updatedAt: now
		})
		.where(eq(postTargets.status, 'publishing'))
		.run();
}

export function deletePost(id: number): string[] {
	const files = db
		.select({ fileName: postMedia.fileName })
		.from(postMedia)
		.where(eq(postMedia.postId, id))
		.all()
		.map((m) => m.fileName);
	db.delete(posts).where(eq(posts.id, id)).run();
	return files;
}
