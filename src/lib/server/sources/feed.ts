import { XMLParser } from 'fast-xml-parser';

export type FeedItem = {
	guid: string;
	article: string;
	summary: string;
	/** Full article HTML when the feed carries it; '' when only a summary is available. */
	contentHtml: string;
	/** YouTube video id, for feeds of video channels. */
	videoId: string;
	/** A picture for the preview: the video thumbnail or the feed's image; '' when it has none. */
	imageUrl: string;
	url: string;
	publishedAt: number;
};

const SUMMARY_LENGTH = 300;
/** A feed whose text is no longer than this is treated as a summary, not the full article. */
const FULL_TEXT_MIN = 500;

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@',
	textNodeName: '#text',
	isArray: (name) => ['item', 'entry', 'link'].includes(name)
});

export function isFeed(body: string): boolean {
	return /<(rss|feed|rdf:RDF)[\s>]/.test(body.slice(0, 2000));
}

/** The first RSS or Atom feed a web page advertises with `<link rel="alternate">`. */
export function discoverFeed(html: string, pageUrl: string): string | undefined {
	for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
		const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/);
		const type = attribute(tag, 'type')?.toLowerCase();
		const href = attribute(tag, 'href');
		if (!rel?.includes('alternate') || !href) continue;
		if (type !== 'application/rss+xml' && type !== 'application/atom+xml') continue;
		return new URL(decodeEntities(href), pageUrl).toString();
	}
	return undefined;
}

/**
 * The picture a page offers for link previews (`og:image`, else `twitter:image`), as an absolute
 * https address.
 */
export function pageImage(html: string, pageUrl: string): string | undefined {
	const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => ({
		key: (attribute(tag, 'property') ?? attribute(tag, 'name'))?.toLowerCase(),
		content: attribute(tag, 'content')
	}));
	for (const key of ['og:image', 'og:image:url', 'twitter:image']) {
		const content = metas.find((m) => m.key === key && m.content)?.content;
		if (content) return httpsUrl(decodeEntities(content), pageUrl);
	}
	return undefined;
}

/** The address as absolute https, or undefined; http pictures would be blocked as mixed content. */
function httpsUrl(url: string, base: string): string | undefined {
	if (!url) return undefined;
	try {
		const absoluteUrl = new URL(url, base);
		return absoluteUrl.protocol === 'https:' ? absoluteUrl.toString() : undefined;
	} catch {
		return undefined;
	}
}

/** The first picture in a piece of HTML. */
function firstImage(html: string, base: string): string | undefined {
	const tag = /<img\b[^>]*>/i.exec(html)?.[0];
	const src = tag && attribute(tag, 'src');
	return src ? httpsUrl(decodeEntities(src), base) : undefined;
}

/** The url attribute of an RSS media or enclosure element, when it is a picture. */
function mediaImage(value: unknown): string | undefined {
	for (const element of Array.isArray(value) ? value : [value]) {
		const media = element as Record<string, string> | undefined;
		const url = media?.['@url'];
		const type = media?.['@type'] ?? '';
		const medium = media?.['@medium'] ?? '';
		if (url && (type.startsWith('image/') || medium === 'image' || (!type && !medium))) return url;
	}
	return undefined;
}

function attribute(tag: string, name: string): string | undefined {
	const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
	return match ? (match[2] ?? match[3] ?? match[4]) : undefined;
}

export function parseFeed(xml: string, feedUrl: string): FeedItem[] {
	const doc = parser.parse(xml) as Record<string, Record<string, unknown>>;
	if (doc.rss) return rssItems(doc.rss.channel as Record<string, unknown>, feedUrl);
	if (doc['rdf:RDF']) return rssItems(doc['rdf:RDF'], feedUrl);
	if (doc.feed) return atomEntries(doc.feed, feedUrl);
	throw new Error('Not an RSS or Atom feed.');
}

function rssItems(channel: Record<string, unknown> | undefined, feedUrl: string): FeedItem[] {
	const items = (channel?.item as Record<string, unknown>[] | undefined) ?? [];
	return items.map((item) => {
		const links = (item.link as unknown[] | undefined) ?? [];
		const url = absolute(text(links[0]) || text(item.guid), feedUrl);
		const description = text(item.description);
		const content = text(item['content:encoded']);
		return feedEntry({
			guid: text(item.guid) || url,
			title: text(item.title),
			url,
			published: text(item.pubDate) || text(item['dc:date']),
			description,
			content,
			videoId: '',
			image:
				mediaImage(item['media:thumbnail']) ??
				mediaImage(item['media:content']) ??
				mediaImage(item.enclosure) ??
				firstImage(content || description, url) ??
				''
		});
	});
}

function atomEntries(feed: Record<string, unknown>, feedUrl: string): FeedItem[] {
	const entries = (feed.entry as Record<string, unknown>[] | undefined) ?? [];
	return entries.map((item) => {
		const links = (item.link as Record<string, string>[] | undefined) ?? [];
		const link = links.find((l) => !l['@rel'] || l['@rel'] === 'alternate') ?? links[0];
		const url = absolute(link?.['@href'] ?? '', feedUrl);
		const media = item['media:group'] as Record<string, unknown> | undefined;
		return feedEntry({
			guid: text(item.id) || url,
			title: text(item.title),
			url,
			published: text(item.published) || text(item.updated),
			description: text(item.summary) || text(media?.['media:description']),
			content: text(item.content),
			videoId: text(item['yt:videoId']),
			image:
				mediaImage(media?.['media:thumbnail']) ??
				mediaImage(item['media:thumbnail']) ??
				firstImage(text(item.content) || text(item.summary), url) ??
				''
		});
	});
}

/** A feed item from the parts every feed has; `published` is any date `Date.parse` reads. */
export function feedEntry(raw: {
	guid: string;
	title: string;
	url: string;
	published: string;
	description: string;
	content: string;
	videoId: string;
	image: string;
}): FeedItem {
	const fullHtml = raw.content || raw.description;
	const fullText = plainText(fullHtml);
	const summary = truncate(plainText(raw.description) || fullText);
	const published = Date.parse(raw.published);
	return {
		guid: raw.guid,
		article: plainText(raw.title) || truncate(fullText, 80) || raw.url,
		summary,
		contentHtml:
			fullText.length > FULL_TEXT_MIN && fullText.length > summary.length ? fullHtml : '',
		videoId: raw.videoId,
		imageUrl: raw.videoId
			? `https://i.ytimg.com/vi/${encodeURIComponent(raw.videoId)}/hqdefault.jpg`
			: (httpsUrl(raw.image, raw.url) ?? ''),
		url: raw.url,
		publishedAt: Number.isNaN(published) ? Date.now() : published
	};
}

function text(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'object') return text((value as Record<string, unknown>)['#text']);
	return String(value).trim();
}

function absolute(url: string, base: string): string {
	try {
		return new URL(url, base).toString();
	} catch {
		return url;
	}
}

export function plainText(html: string): string {
	return decodeEntities(
		html.replace(/<(script|style)\b[^]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
	)
		.replace(/\s+/g, ' ')
		.trim();
}

function truncate(value: string, length = SUMMARY_LENGTH): string {
	if (value.length <= length) return value;
	return `${value.slice(0, length).replace(/\s+\S*$/, '')}…`;
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

function decodeEntities(value: string): string {
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code[0] === '#') {
			const point =
				code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
			return Number.isFinite(point) ? String.fromCodePoint(point) : match;
		}
		return ENTITIES[code.toLowerCase()] ?? match;
	});
}
