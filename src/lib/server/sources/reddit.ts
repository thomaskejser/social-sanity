import { redditGet } from '../integrations/reddit.ts';
import { redditPostsPath, type RedditCommunity } from '#lib/reddit.ts';
import { feedEntry, type FeedItem } from './feed.ts';

type RedditPost = {
	name?: string;
	title?: string;
	permalink?: string;
	selftext_html?: string | null;
	created_utc?: number;
	stickied?: boolean;
	over_18?: boolean;
	thumbnail?: string;
	preview?: { images?: { source?: { url?: string } }[] };
};

/** Reddit puts words such as "self" or "default" in `thumbnail` when a post has no picture. */
function httpsThumbnail(thumbnail: string | undefined): string {
	return thumbnail?.startsWith('https://') ? thumbnail : '';
}

/**
 * The posts of a Reddit listing (fetched with `raw_json=1`) as feed items. Pinned and adult posts
 * are left out.
 */
export function parseRedditPosts(listing: Record<string, unknown>): FeedItem[] {
	const data = listing.data as { children?: { kind?: string; data?: RedditPost }[] } | undefined;
	return (data?.children ?? [])
		.filter((child) => child.kind === 't3' && child.data?.name && child.data.permalink)
		.map((child) => child.data!)
		.filter((post) => !post.stickied && !post.over_18)
		.map((post) =>
			feedEntry({
				guid: post.name!,
				title: post.title ?? '',
				url: `https://www.reddit.com${post.permalink}`,
				published: new Date((post.created_utc ?? 0) * 1000).toISOString(),
				description: post.selftext_html ?? '',
				content: '',
				videoId: '',
				image: post.preview?.images?.[0]?.source?.url ?? httpsThumbnail(post.thumbnail)
			})
		);
}

/** A subreddit's hot posts, or a profile's newest, read as the connected Reddit account. */
export async function fetchRedditPosts(community: RedditCommunity): Promise<FeedItem[]> {
	return parseRedditPosts(await redditGet(redditPostsPath(community), { limit: '25' }));
}
