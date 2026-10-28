import { describe, expect, it } from 'vitest';
import { discoverFeed, isFeed, pageImage, parseFeed, plainText } from './feed.ts';

const LONG = 'Lorem ipsum dolor sit amet. '.repeat(40);

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>A blog</title>
    <item>
      <title>First &amp; best</title>
      <link>/posts/first</link>
      <guid>first-guid</guid>
      <pubDate>Mon, 05 Oct 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;Short teaser&lt;/p&gt;</description>
      <content:encoded><![CDATA[<p>${LONG}</p>]]></content:encoded>
    </item>
    <item>
      <title>Teaser only</title>
      <link>https://blog.example.com/posts/second</link>
      <description>Just a teaser.</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <id>yt:video:abc123</id>
    <yt:videoId>abc123</yt:videoId>
    <title>A video</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
    <published>2026-10-01T08:00:00+00:00</published>
    <media:group><media:description>About the video</media:description></media:group>
  </entry>
</feed>`;

describe('parseFeed', () => {
	it('reads RSS items, keeping full content only when the feed carries it', () => {
		const [first, second] = parseFeed(RSS, 'https://blog.example.com/feed.xml');
		expect(first.article).toBe('First & best');
		expect(first.url).toBe('https://blog.example.com/posts/first');
		expect(first.guid).toBe('first-guid');
		expect(first.summary).toBe('Short teaser');
		expect(first.contentHtml).toContain('Lorem ipsum');
		expect(first.publishedAt).toBe(Date.parse('2026-10-05T10:00:00Z'));
		expect(second.contentHtml).toBe('');
		expect(second.guid).toBe('https://blog.example.com/posts/second');
	});

	it('reads Atom entries and YouTube video ids', () => {
		const [video] = parseFeed(ATOM, 'https://www.youtube.com/feeds/videos.xml?channel_id=x');
		expect(video.videoId).toBe('abc123');
		expect(video.summary).toBe('About the video');
		expect(video.url).toBe('https://www.youtube.com/watch?v=abc123');
	});

	it('rejects documents that are not feeds', () => {
		expect(() => parseFeed('<html><body/></html>', 'https://example.com')).toThrow();
		expect(isFeed('<html><body/></html>')).toBe(false);
		expect(isFeed(RSS)).toBe(true);
	});
});

describe('discoverFeed', () => {
	it('finds the advertised feed and resolves it against the page', () => {
		const html = `<head><link rel="stylesheet" href="/a.css">
			<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml?a=1&amp;b=2"></head>`;
		expect(discoverFeed(html, 'https://blog.example.com/about')).toBe(
			'https://blog.example.com/feed.xml?a=1&b=2'
		);
	});

	it('returns nothing when a page has no feed', () => {
		expect(discoverFeed('<head><link rel="icon" href="/x.png"></head>', 'https://x.com')).toBe(
			undefined
		);
	});
});

describe('plainText', () => {
	it('strips tags, scripts and entities', () => {
		expect(plainText('<p>a&nbsp;<b>b</b></p><script>x()</script>&#39;c&#x27;')).toBe("a b 'c'");
	});
});

describe('preview pictures', () => {
	const rss = (item: string) =>
		`<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>T</title><link>https://blog.example/post</link>${item}</item></channel></rss>`;

	it('takes the media thumbnail, then an image enclosure, then the first picture', () => {
		expect(
			parseFeed(
				rss('<media:thumbnail url="https://img.example/t.jpg"/>'),
				'https://blog.example/feed'
			)[0].imageUrl
		).toBe('https://img.example/t.jpg');
		expect(
			parseFeed(
				rss('<enclosure url="https://img.example/e.png" type="image/png" length="1"/>'),
				'https://blog.example/feed'
			)[0].imageUrl
		).toBe('https://img.example/e.png');
		expect(
			parseFeed(
				rss('<description>&lt;p&gt;Hi &lt;img src="/a.jpg"&gt;&lt;/p&gt;</description>'),
				'https://blog.example/feed'
			)[0].imageUrl
		).toBe('https://blog.example/a.jpg');
	});

	it('ignores audio enclosures and plain http pictures', () => {
		expect(
			parseFeed(
				rss('<enclosure url="https://cdn.example/ep.mp3" type="audio/mpeg" length="1"/>'),
				'https://blog.example/feed'
			)[0].imageUrl
		).toBe('');
		expect(
			parseFeed(
				rss('<media:thumbnail url="http://img.example/t.jpg"/>'),
				'https://blog.example/feed'
			)[0].imageUrl
		).toBe('');
	});

	it('uses the YouTube thumbnail for videos', () => {
		const atom = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><id>yt:video:abc</id><yt:videoId>abc</yt:videoId><title>V</title><link rel="alternate" href="https://www.youtube.com/watch?v=abc"/><published>2026-10-01T00:00:00Z</published></entry></feed>`;
		expect(parseFeed(atom, 'https://www.youtube.com/feeds/videos.xml')[0].imageUrl).toBe(
			'https://i.ytimg.com/vi/abc/hqdefault.jpg'
		);
	});
});

describe('pageImage', () => {
	it('reads og:image, then twitter:image, made absolute', () => {
		expect(
			pageImage('<meta property="og:image" content="/cover.jpg">', 'https://site.example/a')
		).toBe('https://site.example/cover.jpg');
		expect(
			pageImage(
				'<meta name="twitter:image" content="https://cdn.example/x.png">',
				'https://site.example/a'
			)
		).toBe('https://cdn.example/x.png');
	});

	it('finds nothing when the page offers nothing', () => {
		expect(pageImage('<title>No picture</title>', 'https://site.example/a')).toBeUndefined();
	});
});
