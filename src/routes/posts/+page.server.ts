import { PLATFORMS } from '#lib/format/index.ts';
import type { TargetStatus } from '#lib/posts/status.ts';
import { listAttempts } from '#lib/server/posts/attempts.ts';
import { listPosts } from '#lib/server/posts/repo-posts.ts';
import { getGitRepo } from '#lib/server/repo/store.ts';
import { syncRepo } from '#lib/server/repo/sync.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repo = getGitRepo();
	if (!repo) return { repo: null, posts: [] };
	const attempts = listAttempts();
	const posts = await listPosts(repo);
	return {
		repo: {
			url: repo.url,
			branch: repo.branch,
			postsDir: repo.postsDir,
			lastSyncAt: repo.lastSyncAt,
			lastSyncOk: repo.lastSyncOk,
			lastSyncMessage: repo.lastSyncMessage
		},
		posts: posts.map((post) => ({
			id: post.id,
			title: post.title,
			date: post.date,
			text: post.text,
			mediaCount: post.mediaCount,
			error: post.error,
			statuses: PLATFORMS.map((platform) => {
				const attempt = attempts.find((a) => a.postId === post.id && a.platform === platform.id);
				const status: TargetStatus =
					post.published.includes(platform.id) || attempt?.status === 'unrecorded'
						? 'published'
						: (attempt?.status ?? 'draft');
				return { platform: platform.id, status };
			})
		}))
	};
};

export const actions: Actions = {
	sync: async () => {
		const result = await syncRepo();
		return { sync: result ?? { ok: false, message: 'No posts repository is configured.' } };
	}
};
