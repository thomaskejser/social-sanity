import { listPosts } from '#lib/server/posts/store.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	posts: listPosts().map((post) => ({
		id: post.id,
		text: post.text,
		createdAt: post.createdAt,
		mediaCount: post.mediaCount,
		targets: post.targets.map((t) => ({ platform: t.platform, status: t.status }))
	}))
});
