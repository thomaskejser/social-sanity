import { describe, expect, it, vi } from 'vitest';

vi.mock('../integrations/reddit.ts', () => ({ redditGet: vi.fn() }));

const { parseRedditPosts } = await import('./reddit.ts');

const post = (data: Record<string, unknown>) => ({
	kind: 't3',
	data: {
		name: 't3_abc',
		title: 'Rust 2.0 &amp; you',
		permalink: '/r/rust/comments/abc/rust_20/',
		created_utc: 1_700_000_000,
		selftext_html: '',
		thumbnail: 'self',
		...data
	}
});

describe('parseRedditPosts', () => {
	it('turns posts into feed items linking to the discussion', () => {
		const [item] = parseRedditPosts({
			data: {
				children: [
					post({
						preview: { images: [{ source: { url: 'https://preview.redd.it/x.jpg?a=1&b=2' } }] }
					})
				]
			}
		});
		expect(item.guid).toBe('t3_abc');
		expect(item.article).toBe('Rust 2.0 & you');
		expect(item.url).toBe('https://www.reddit.com/r/rust/comments/abc/rust_20/');
		expect(item.publishedAt).toBe(1_700_000_000_000);
		expect(item.imageUrl).toBe('https://preview.redd.it/x.jpg?a=1&b=2');
	});

	it('keeps the text of a text post as its summary', () => {
		const [item] = parseRedditPosts({
			data: { children: [post({ selftext_html: '<div><p>Hello <b>world</b></p></div>' })] }
		});
		expect(item.summary).toBe('Hello world');
		expect(item.imageUrl).toBe('');
	});

	it('leaves out pinned and adult posts, and anything that is not a post', () => {
		expect(
			parseRedditPosts({
				data: {
					children: [
						post({ stickied: true }),
						post({ over_18: true }),
						{ kind: 't1', data: { name: 't1_x', permalink: '/x' } }
					]
				}
			})
		).toEqual([]);
		expect(parseRedditPosts({})).toEqual([]);
	});
});
