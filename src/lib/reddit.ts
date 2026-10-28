/** A subreddit (`r/name`) or a Reddit user's profile (`u/name`). */
export type RedditCommunity = { kind: 'subreddit' | 'user'; name: string };

const NAME = /^[A-Za-z0-9_-]{2,40}$/;

/** The address of a subreddit or profile on reddit.com. */
export function redditUrl(community: RedditCommunity): string {
	const name = encodeURIComponent(community.name);
	return community.kind === 'subreddit'
		? `https://www.reddit.com/r/${name}/`
		: `https://www.reddit.com/user/${name}/`;
}

/** The subreddit or profile a reddit.com address points into, or undefined when it is neither. */
export function parseRedditUrl(url: string): RedditCommunity | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}
	const host = parsed.hostname.toLowerCase();
	if (host !== 'reddit.com' && !host.endsWith('.reddit.com')) return undefined;
	const [section, name] = parsed.pathname.split('/').filter(Boolean);
	if (!name || !NAME.test(name)) return undefined;
	if (section === 'r') return { kind: 'subreddit', name };
	if (section === 'user' || section === 'u') return { kind: 'user', name };
	return undefined;
}

/** The API path of a community's posts: a subreddit's hot posts, or what a user submitted. */
export function redditPostsPath(community: RedditCommunity): string {
	const name = encodeURIComponent(community.name);
	return community.kind === 'subreddit' ? `/r/${name}/hot` : `/user/${name}/submitted`;
}

/** The public feed of the same posts, for reading without a connected account. */
export function redditFeedUrl(community: RedditCommunity): string {
	return `https://www.reddit.com${redditPostsPath(community)}/.rss`;
}
