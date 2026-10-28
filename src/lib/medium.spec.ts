import { describe, expect, it } from 'vitest';
import { mediumFeedUrl, mediumProfileFeedUrl } from './medium.ts';

describe('mediumFeedUrl', () => {
	it.each([
		['https://medium.com/@jane', 'https://medium.com/feed/@jane'],
		['https://medium.com/@jane/', 'https://medium.com/feed/@jane'],
		['https://www.medium.com/@jane?source=home', 'https://medium.com/feed/@jane'],
		['https://medium.com/@jane/my-story-1a2b3c4d5e6f', 'https://medium.com/feed/@jane'],
		['https://medium.com/@jane.doe', 'https://medium.com/feed/@jane.doe'],
		['http://medium.com/@jane', 'https://medium.com/feed/@jane'],
		['https://medium.com/better-programming', 'https://medium.com/feed/better-programming'],
		[
			'https://medium.com/better-programming/a-story-1a2b3c4d5e6f',
			'https://medium.com/feed/better-programming'
		],
		[
			'https://medium.com/better-programming/tagged/rust',
			'https://medium.com/feed/better-programming/tagged/rust'
		],
		['https://medium.com/tag/databases', 'https://medium.com/feed/tag/databases'],
		['https://jane.medium.com/', 'https://jane.medium.com/feed'],
		['https://jane.medium.com/my-story-1a2b3c4d5e6f', 'https://jane.medium.com/feed']
	])('%s → %s', (url, feed) => {
		expect(mediumFeedUrl(url)).toBe(feed);
	});

	it.each([
		['not a url'],
		['ftp://medium.com/@jane'],
		['https://example.com/@jane'],
		['https://notmedium.com/@jane'],
		['https://medium.com/'],
		['https://medium.com/@'],
		['https://medium.com/feed/@jane'],
		['https://medium.com/p/1a2b3c4d5e6f'],
		['https://medium.com/m/signin'],
		['https://medium.com/search?q=rust'],
		['https://medium.com/tag/'],
		['https://www.medium.com/'],
		['https://help.medium.com/hc/en-us'],
		['https://a.b.medium.com/']
	])('ignores %s', (url) => {
		expect(mediumFeedUrl(url)).toBeUndefined();
	});
});

describe('mediumProfileFeedUrl', () => {
	it('builds the profile feed of a username', () => {
		expect(mediumProfileFeedUrl('jane')).toBe('https://medium.com/feed/@jane');
	});
});
