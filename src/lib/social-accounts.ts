import type { SocialBrand } from './social-logos/social-logos.ts';

/** The platforms a social account can be on; each has a logo in the social-logos set. */
export const SOCIAL_PLATFORMS = [
	'bluesky',
	'facebook',
	'github',
	'instagram',
	'linkedin',
	'mastodon',
	'medium',
	'pinterest',
	'reddit',
	'substack',
	'threads',
	'tiktok',
	'tumblr',
	'twitch',
	'vimeo',
	'x',
	'youtube'
] as const satisfies readonly SocialBrand[];

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialAccount = { socialAccountId: number; platform: SocialPlatform; url: string };

const HOSTS: Record<string, SocialPlatform> = {
	'bsky.app': 'bluesky',
	'facebook.com': 'facebook',
	'fb.com': 'facebook',
	'github.com': 'github',
	'instagram.com': 'instagram',
	'linkedin.com': 'linkedin',
	'medium.com': 'medium',
	'pinterest.com': 'pinterest',
	'reddit.com': 'reddit',
	'substack.com': 'substack',
	'threads.net': 'threads',
	'threads.com': 'threads',
	'tiktok.com': 'tiktok',
	'tumblr.com': 'tumblr',
	'twitch.tv': 'twitch',
	'vimeo.com': 'vimeo',
	'x.com': 'x',
	'twitter.com': 'x',
	'youtube.com': 'youtube',
	'youtu.be': 'youtube'
};

export function isSocialPlatform(value: unknown): value is SocialPlatform {
	return SOCIAL_PLATFORMS.includes(value as SocialPlatform);
}

/**
 * Works out the platform of a profile address. Subdomains count (`www.`, `dk.linkedin.com`,
 * `name.substack.com`); an address on any other host whose path starts with `/@name` is taken as a
 * Mastodon profile. Returns undefined for anything else.
 */
export function parseSocialAccount(
	value: string
): { platform: SocialPlatform; url: string } | undefined {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		return undefined;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
	const host = url.hostname.toLowerCase();
	const known = Object.entries(HOSTS).find(
		([domain]) => host === domain || host.endsWith(`.${domain}`)
	);
	if (known) return { platform: known[1], url: url.toString() };
	if (/^\/@[^/]+/.test(url.pathname)) return { platform: 'mastodon', url: url.toString() };
	return undefined;
}

/** A short label for an account: the handle in its address where there is one. */
export function accountHandle(url: string): string {
	try {
		const { hostname, pathname } = new URL(url);
		const path = pathname.replace(/\/+$/, '').replace(/^\/(in|company|user|u|c)\//, '/');
		return path && path !== '/'
			? decodeURIComponent(path.slice(1))
			: hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}
