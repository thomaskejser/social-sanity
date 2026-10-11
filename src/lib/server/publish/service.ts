import { PUBLIC_BASE_URL } from '$app/env/private';
import {
	checkPost,
	hasErrors,
	platformFormat,
	type DraftMedia,
	type PlatformId
} from '#lib/format/index.ts';
import type { Account, PostMedia, PostTarget } from '../db/schema.ts';
import { getFtpServer } from '../ftp/store.ts';
import { uploadToFileServer } from '../ftp/transfer.ts';
import { getAccessToken, listAccounts } from '../integrations/accounts.ts';
import { readMedia } from '../media/store.ts';
import { claimTargets, getPost, markFailed, markPublished } from '../posts/store.ts';
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

export function draftMedia(media: PostMedia[]): DraftMedia[] {
	return media.map(({ kind, mimeType, originalName }) => ({ kind, mimeType, originalName }));
}

/** Why `target` can't be published right now, or undefined when it can. */
export function blockedReason(
	target: PostTarget,
	media: PostMedia[],
	account: Account | undefined,
	now = Date.now()
): string | undefined {
	const name = platformFormat(target.platform as PlatformId).name;
	if (target.status === 'published') return `Already published to ${name}.`;
	if (target.status === 'publishing') return `Already publishing to ${name}.`;
	if (!account) return `${name} is not connected. Connect it on the Integrations page.`;
	if (account.expiresAt !== null && account.expiresAt <= now) {
		return `The ${name} token has expired. Reconnect it on the Integrations page.`;
	}
	const issues = checkPost(target.platform as PlatformId, target.text, draftMedia(media));
	if (hasErrors(issues)) return `${name}: ${issues.find((i) => i.level === 'error')?.message}`;
	return undefined;
}

async function publicMediaUrl(item: PostMedia): Promise<string> {
	const server = getFtpServer();
	if (server?.publicUrl) {
		const { publicUrl } = await uploadToFileServer(
			server,
			item.fileName,
			await readMedia(item.fileName)
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
	return `${PUBLIC_BASE_URL}/media/${item.fileName}`;
}

function toPublishMedia(item: PostMedia): PublishMedia {
	return {
		kind: item.kind,
		mimeType: item.mimeType,
		size: item.size,
		read: () => readMedia(item.fileName),
		publicUrl: () => publicMediaUrl(item)
	};
}

async function run(postId: number, target: PostTarget, media: PostMedia[], account: Account) {
	const platform = target.platform as PlatformId;
	try {
		const result = await PUBLISHERS[platform]({
			accessToken: getAccessToken(account),
			accountId: account.externalId,
			text: target.text,
			media: media.map(toPublishMedia)
		});
		markPublished(postId, platform, result);
	} catch (error) {
		markFailed(postId, platform, error instanceof Error ? error.message : String(error));
	}
}

/** Starts publishing the post to each platform that is ready, in the background. Platforms
 * that are not ready are reported with the reason. */
export function startPublishing(
	postId: number,
	platforms: PlatformId[]
): { started: PlatformId[]; skipped: Skipped[] } {
	const post = getPost(postId);
	if (!post) throw new Error(`Post ${postId} not found`);
	const accounts = listAccounts();
	const ready: PlatformId[] = [];
	const skipped: Skipped[] = [];

	for (const platform of platforms) {
		const target = post.targets.find((t) => t.platform === platform);
		if (!target) continue;
		const account = accounts.find((a) => a.platform === platform);
		const reason = blockedReason(target, post.media, account);
		if (reason) skipped.push({ platform, reason });
		else ready.push(platform);
	}

	const claimed = ready.length > 0 ? claimTargets(postId, ready) : [];
	for (const target of claimed) {
		const account = accounts.find((a) => a.platform === target.platform);
		if (account) void run(postId, target, post.media, account);
	}
	return { started: claimed.map((t) => t.platform as PlatformId), skipped };
}
