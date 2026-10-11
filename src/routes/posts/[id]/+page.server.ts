import { error, fail, redirect } from '@sveltejs/kit';
import { isPlatformId, PLATFORM_IDS, PLATFORMS, type PlatformId } from '#lib/format/index.ts';
import { mediaUrl } from '#lib/media.ts';
import { listAccounts } from '#lib/server/integrations/accounts.ts';
import { deleteMedia } from '#lib/server/media/store.ts';
import { deletePost, getPost, saveTargetTexts } from '#lib/server/posts/store.ts';
import { startPublishing } from '#lib/server/publish/service.ts';
import type { Actions, PageServerLoad } from './$types';

function postId(param: string): number {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Post not found');
	return id;
}

function loadPost(param: string) {
	const post = getPost(postId(param));
	if (!post) error(404, 'Post not found');
	return post;
}

function textsFrom(form: FormData): Partial<Record<PlatformId, string>> {
	const texts: Partial<Record<PlatformId, string>> = {};
	for (const id of PLATFORM_IDS) {
		const value = form.get(`text-${id}`);
		if (typeof value === 'string') texts[id] = value;
	}
	return texts;
}

export const load: PageServerLoad = ({ params }) => {
	const post = loadPost(params.id);
	const accounts = listAccounts();
	const now = Date.now();

	return {
		post: { id: post.id, text: post.text, createdAt: post.createdAt },
		media: post.media.map((m) => ({
			kind: m.kind,
			mimeType: m.mimeType,
			originalName: m.originalName,
			url: mediaUrl(m.fileName)
		})),
		platforms: PLATFORMS.map((platform) => {
			const account = accounts.find((a) => a.platform === platform.id);
			const target = post.targets.find((t) => t.platform === platform.id);
			if (!target) error(500, `Post ${post.id} has no ${platform.name} version`);
			const expired = account?.expiresAt != null && account.expiresAt <= now;
			return {
				id: platform.id,
				account: account ? { displayName: account.displayName } : null,
				accountProblem: !account
					? `${platform.name} is not connected.`
					: expired
						? `The ${platform.name} token has expired.`
						: null,
				generated: platform.format(post.text),
				target: {
					text: target.text,
					status: target.status,
					remoteUrl: target.remoteUrl,
					error: target.error,
					publishedAt: target.publishedAt
				}
			};
		})
	};
};

export const actions: Actions = {
	save: async ({ params, request }) => {
		const post = loadPost(params.id);
		saveTargetTexts(post.id, textsFrom(await request.formData()));
		return { saved: true };
	},

	publish: async ({ params, request }) => {
		const post = loadPost(params.id);
		const form = await request.formData();
		saveTargetTexts(post.id, textsFrom(form));
		const choice = form.get('platform');
		const platforms = choice === 'all' ? PLATFORM_IDS : isPlatformId(choice) ? [choice] : null;
		if (!platforms) return fail(400, { skipped: [], started: [], message: 'Unknown platform.' });
		const outcome = startPublishing(post.id, platforms);
		return outcome.started.length > 0 ? outcome : fail(400, outcome);
	},

	delete: async ({ params }) => {
		const post = loadPost(params.id);
		if (post.targets.some((t) => t.status === 'publishing')) {
			return fail(409, { message: 'Wait until publishing has finished before deleting.' });
		}
		await deleteMedia(deletePost(post.id));
		redirect(303, '/posts');
	}
};
