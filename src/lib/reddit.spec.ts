import { describe, expect, it } from 'vitest';
import { parseRedditUrl, redditFeedUrl, redditPostsPath, redditUrl } from './reddit.ts';

describe('parseRedditUrl', () => {
	it('reads subreddits and profiles on any reddit.com host', () => {
		expect(parseRedditUrl('https://www.reddit.com/r/rust/')).toEqual({
			kind: 'subreddit',
			name: 'rust'
		});
		expect(parseRedditUrl('https://old.reddit.com/user/spez/submitted')).toEqual({
			kind: 'user',
			name: 'spez'
		});
		expect(parseRedditUrl('https://reddit.com/u/spez')).toEqual({ kind: 'user', name: 'spez' });
	});

	it('rejects other sites, other pages and odd names', () => {
		expect(parseRedditUrl('https://notreddit.com/r/rust/')).toBeUndefined();
		expect(parseRedditUrl('https://www.reddit.com/')).toBeUndefined();
		expect(parseRedditUrl('https://www.reddit.com/settings/account')).toBeUndefined();
		expect(parseRedditUrl('https://www.reddit.com/r/a%2Fb/')).toBeUndefined();
		expect(parseRedditUrl('not a url')).toBeUndefined();
	});

	it('round-trips with redditUrl', () => {
		const sub = { kind: 'subreddit', name: 'rust' } as const;
		expect(parseRedditUrl(redditUrl(sub))).toEqual(sub);
		const user = { kind: 'user', name: 'spez' } as const;
		expect(parseRedditUrl(redditUrl(user))).toEqual(user);
	});
});

describe('posts', () => {
	it('reads hot posts of a subreddit and submissions of a person', () => {
		expect(redditPostsPath({ kind: 'subreddit', name: 'rust' })).toBe('/r/rust/hot');
		expect(redditFeedUrl({ kind: 'user', name: 'spez' })).toBe(
			'https://www.reddit.com/user/spez/submitted/.rss'
		);
	});
});
