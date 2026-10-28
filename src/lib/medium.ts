const MEDIUM = 'https://medium.com';

/** First path segments on medium.com that name Medium's own pages, not a publication. */
const RESERVED = new Set([
	'feed',
	'm',
	'me',
	'p',
	'plans',
	'membership',
	'search',
	'about',
	'creators',
	'policy',
	'jobs-at-medium',
	'new-story',
	'signin',
	'tag',
	'tags',
	'topics'
]);

/** Subdomains of medium.com that are Medium's own services, not a writer's or publication's. */
const RESERVED_SUBDOMAINS = new Set(['help', 'api', 'policy', 'miro', 'cdn-images-1']);

/**
 * The RSS feed of the Medium profile, publication or tag a medium.com URL points into, or undefined
 * when the URL is not one. A story URL gives the feed of its writer or publication. Publications on
 * their own domains are not recognised; their pages advertise their feed.
 */
export function mediumFeedUrl(url: string): string | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
	const host = parsed.hostname.toLowerCase().replace(/^www\.medium\.com$/, 'medium.com');
	const segments = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);

	if (host !== 'medium.com' && host.endsWith('.medium.com')) {
		const subdomain = host.slice(0, -'.medium.com'.length);
		if (subdomain.includes('.') || RESERVED_SUBDOMAINS.has(subdomain)) return undefined;
		return `https://${host}/feed`;
	}
	if (host !== 'medium.com') return undefined;

	const [first, second, third] = segments;
	if (!first) return undefined;
	if (first.startsWith('@')) {
		if (first.length === 1) return undefined;
		return mediumProfileFeedUrl(first.slice(1));
	}
	if (first === 'tag' && second) return `${MEDIUM}/feed/tag/${encodeURIComponent(second)}`;
	if (RESERVED.has(first.toLowerCase())) return undefined;
	const publication = encodeURIComponent(first);
	if (second === 'tagged' && third)
		return `${MEDIUM}/feed/${publication}/tagged/${encodeURIComponent(third)}`;
	return `${MEDIUM}/feed/${publication}`;
}

/** The RSS feed of a Medium user's own profile. */
export function mediumProfileFeedUrl(username: string): string {
	return `${MEDIUM}/feed/@${encodeURIComponent(username)}`;
}
