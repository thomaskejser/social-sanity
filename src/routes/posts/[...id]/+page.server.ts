import { error, fail, redirect } from '@sveltejs/kit';
import { isPlatformId, PLATFORM_IDS, PLATFORMS, type PlatformId } from '#lib/format/index.ts';
import { mediaUrl } from '#lib/media.ts';
import type { TargetStatus } from '#lib/posts/status.ts';
import { listAccounts } from '#lib/server/integrations/accounts.ts';
import { clearAttempts, listAttempts } from '#lib/server/posts/attempts.ts';
import {
	deletePost,
	getPost,
	platformText,
	savePlatformTexts
} from '#lib/server/posts/repo-posts.ts';
import { startPublishing } from '#lib/server/publish/service.ts';
import { requireRepo } from '#lib/server/repo/store.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPost(id: string) {
	const repo = requireRepo();
	const post = await getPost(repo, id).catch((cause: Error) => error(422, cause.message));
	if (!post) error(404, 'Post not found in the repository');
	return { repo, post };
}

function textsFrom(form: FormData): Partial<Record<PlatformId, string>> {
	const texts: Partial<Record<PlatformId, string>> = {};
	for (const id of PLATFORM_IDS) {
		const value = form.get(`text-${id}`);
		if (typeof value === 'string') texts[id] = value;
	}
	return texts;
}

const writeWarning = (pushError: string | null) =>
	pushError ? `Saved in the local clone, but pushing failed: ${pushError}` : null;

export const load: PageServerLoad = async ({ params, url }) => {
	const { repo, post } = await loadPost(params.id);
	const accounts = listAccounts();
	const attempts = listAttempts(post.id);
	const now = Date.now();

	return {
		post: {
			id: post.id,
			title: post.parsed.title,
			repoPath: post.repoPath,
			problems: post.problems,
			repoUrl: repo.url
		},
		pushFailed: url.searchParams.has('pushFailed'),
		media: post.media.map((m) => ({
			kind: m.kind,
			mimeType: m.mimeType,
			originalName: m.originalName,
			url: mediaUrl(m.postsPath)
		})),
		platforms: PLATFORMS.map((platform) => {
			const account = accounts.find((a) => a.platform === platform.id);
			const attempt = attempts.find((a) => a.platform === platform.id);
			const published = post.parsed.platforms[platform.id]?.published;
			const expired = account?.expiresAt != null && account.expiresAt <= now;
			const status: TargetStatus =
				published || attempt?.status === 'unrecorded' ? 'published' : (attempt?.status ?? 'draft');
			return {
				id: platform.id,
				account: account ? { displayName: account.displayName } : null,
				accountProblem: !account
					? `${platform.name} is not connected.`
					: expired
						? `The ${platform.name} token has expired.`
						: null,
				generated: platform.format(post.parsed.text),
				text: platformText(post, platform.id),
				status,
				error: attempt?.error ?? null,
				remoteUrl: published?.url ?? attempt?.remoteUrl ?? null
			};
		})
	};
};

export const actions: Actions = {
	save: async ({ params, request }) => {
		const { repo, post } = await loadPost(params.id);
		try {
			const result = await savePlatformTexts(repo, post.id, textsFrom(await request.formData()));
			return { saved: result.changed, warning: writeWarning(result.pushError) };
		} catch (cause) {
			return fail(502, { message: cause instanceof Error ? cause.message : String(cause) });
		}
	},

	publish: async ({ params, request }) => {
		const { repo, post } = await loadPost(params.id);
		const form = await request.formData();
		let warning: string | null;
		try {
			warning = writeWarning((await savePlatformTexts(repo, post.id, textsFrom(form))).pushError);
		} catch (cause) {
			return fail(502, { message: cause instanceof Error ? cause.message : String(cause) });
		}
		const choice = form.get('platform');
		const platforms = choice === 'all' ? PLATFORM_IDS : isPlatformId(choice) ? [choice] : null;
		if (!platforms) return fail(400, { message: 'Unknown platform.' });
		const outcome = await startPublishing(repo, post.id, platforms);
		return outcome.started.length > 0
			? { ...outcome, warning }
			: fail(400, { ...outcome, warning });
	},

	delete: async ({ params }) => {
		const { repo, post } = await loadPost(params.id);
		if (listAttempts(post.id).some((a) => a.status === 'publishing')) {
			return fail(409, { message: 'Wait until publishing has finished before deleting.' });
		}
		try {
			await deletePost(repo, post.id);
		} catch (cause) {
			return fail(502, { message: cause instanceof Error ? cause.message : String(cause) });
		}
		clearAttempts(post.id);
		redirect(303, '/posts');
	}
};
