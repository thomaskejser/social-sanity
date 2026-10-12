import { readFile } from 'node:fs/promises';
import { PUBLIC_BASE_URL } from '$app/env/private';
import { hasErrors, platformFormat, type DraftMedia, type PlatformId } from '#lib/format/index.ts';
import { mediaUrl } from '#lib/media.ts';
import type { Account, GitRepo, PublishAttempt } from '../db/schema.ts';
import { getFtpServer } from '../ftp/store.ts';
import { uploadToFileServer } from '../ftp/transfer.ts';
import { getAccessToken, listAccounts } from '../integrations/accounts.ts';
import {
	clearAttempt,
	failAttempt,
	listAttempts,
	listUnrecorded,
	markUnrecorded,
	startAttempt
} from '../posts/attempts.ts';
import {
	getPost,
	platformText,
	recordPublished,
	type PostMediaFile,
	type RepoPost
} from '../posts/repo-posts.ts';
import { publishInstagram } from './instagram.ts';
import { publishLinkedIn } from './linkedin.ts';
import {
	PublishError,
	type PublishMedia,
	type PublishRequest,
	type PublishResult
} from './types.ts';

const PUBLISHERS: Record<PlatformId, (request: PublishRequest) => Promise<PublishResult>> = {
	linkedin: (request) => publishLinkedIn(request),
	instagram: (request) => publishInstagram(request)
};

export type Skipped = { platform: PlatformId; reason: string };

export function draftMedia(media: PostMediaFile[]): DraftMedia[] {
	return media.map(({ kind, mimeType, originalName }) => ({ kind, mimeType, originalName }));
}

/** Why the post can't be published to `platform` right now, or undefined when it can. */
export function blockedReason(
	post: RepoPost,
	platform: PlatformId,
	attempt: PublishAttempt | undefined,
	account: Account | undefined,
	now = Date.now()
): string | undefined {
	const format = platformFormat(platform);
	if (post.parsed.platforms[platform]?.published) return `Already published to ${format.name}.`;
	if (attempt?.status === 'publishing') return `Already publishing to ${format.name}.`;
	if (attempt?.status === 'unrecorded') return `Already published to ${format.name}.`;
	if (!account) return `${format.name} is not connected. Connect it on the Integrations page.`;
	if (account.expiresAt !== null && account.expiresAt <= now) {
		return `The ${format.name} token has expired. Reconnect it on the Integrations page.`;
	}
	if (post.problems.length > 0) return `${format.name}: ${post.problems[0]}`;
	const issues = format.check(platformText(post, platform), draftMedia(post.media));
	if (hasErrors(issues))
		return `${format.name}: ${issues.find((i) => i.level === 'error')?.message}`;
	return undefined;
}

async function publicMediaUrl(item: PostMediaFile): Promise<string> {
	const server = getFtpServer();
	if (server?.publicUrl) {
		const remoteName = item.postsPath.replace(/[^A-Za-z0-9._-]+/g, '-');
		const { publicUrl } = await uploadToFileServer(
			server,
			remoteName,
			await readFile(item.absolutePath)
		);
		if (publicUrl) return publicUrl;
	}
	if (!PUBLIC_BASE_URL) {
		throw new PublishError(
			"Instagram fetches media from a public URL. Set PUBLIC_BASE_URL to this app's public address, or give the file upload integration a public URL."
		);
	}
	if (/^https?:\/\/(localhost|127\.|\[::1\])/.test(PUBLIC_BASE_URL)) {
		throw new PublishError(
			`PUBLIC_BASE_URL is ${PUBLIC_BASE_URL}, which Instagram can't reach. Use a public address or the file upload integration.`
		);
	}
	return `${PUBLIC_BASE_URL}${mediaUrl(item.postsPath)}`;
}

function toPublishMedia(item: PostMediaFile): PublishMedia {
	return {
		kind: item.kind,
		mimeType: item.mimeType,
		size: item.size,
		read: () => readFile(item.absolutePath),
		publicUrl: () => publicMediaUrl(item)
	};
}

async function record(
	repo: GitRepo,
	postId: string,
	platform: PlatformId,
	result: PublishResult,
	publishedAt: number
) {
	try {
		await recordPublished(repo, postId, platform, {
			url: result.remoteUrl,
			id: result.remoteId,
			publishedAt: new Date(publishedAt).toISOString()
		});
		clearAttempt(postId, platform);
	} catch (error) {
		markUnrecorded(
			postId,
			platform,
			{ ...result, publishedAt },
			`Published, but saving that to the repository failed: ${error instanceof Error ? error.message : String(error)}. It is retried on the next pull.`
		);
	}
}

async function run(repo: GitRepo, post: RepoPost, platform: PlatformId, account: Account) {
	let result: PublishResult;
	try {
		result = await PUBLISHERS[platform]({
			accessToken: getAccessToken(account),
			accountId: account.externalId,
			text: platformText(post, platform),
			media: post.media.map(toPublishMedia)
		});
	} catch (error) {
		failAttempt(post.id, platform, error instanceof Error ? error.message : String(error));
		return;
	}
	await record(repo, post.id, platform, result, Date.now());
}

/** Starts publishing the post to each platform that is ready, in the background. Platforms
 * that are not ready are reported with the reason. */
export async function startPublishing(
	repo: GitRepo,
	postId: string,
	platforms: PlatformId[]
): Promise<{ started: PlatformId[]; skipped: Skipped[] }> {
	const post = await getPost(repo, postId);
	if (!post) throw new Error(`Post ${postId} not found`);
	const accounts = listAccounts();
	const attempts = listAttempts(postId);
	const started: PlatformId[] = [];
	const skipped: Skipped[] = [];

	for (const platform of platforms) {
		const account = accounts.find((a) => a.platform === platform);
		const attempt = attempts.find((a) => a.platform === platform);
		const reason = blockedReason(post, platform, attempt, account);
		if (reason) skipped.push({ platform, reason });
		else if (!account || !startAttempt(postId, platform)) {
			skipped.push({ platform, reason: `Already publishing to ${platformFormat(platform).name}.` });
		} else {
			started.push(platform);
			void run(repo, post, platform, account);
		}
	}
	return { started, skipped };
}

/** Writes publishes that succeeded earlier but could not be saved to the repository. */
export async function recordPendingPublishes(repo: GitRepo) {
	for (const attempt of listUnrecorded()) {
		if (!attempt.remoteId || attempt.publishedAt === null) continue;
		await record(
			repo,
			attempt.postId,
			attempt.platform as PlatformId,
			{ remoteId: attempt.remoteId, remoteUrl: attempt.remoteUrl },
			attempt.publishedAt
		);
	}
}
