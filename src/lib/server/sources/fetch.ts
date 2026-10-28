import { mediumFeedUrl } from '#lib/medium.ts';
import { parseRedditUrl, redditFeedUrl } from '#lib/reddit.ts';
import { isRedditConnected } from '../integrations/reddit.ts';
import { discoverFeed, isFeed, pageImage, parseFeed } from './feed.ts';
import { fetchRedditPosts } from './reddit.ts';
import {
	listArticlesWithoutImage,
	listSources,
	recordFetch,
	saveArticles,
	savePageImage,
	type ContentSource
} from './store.ts';

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 5_000_000;

const SAME_HOST_GAP_MS = 1_000;
const MAX_RETRY_WAIT_MS = 30_000;
const lastRequest = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits so requests to one host are at least a second apart; Medium answers bursts with 429. */
async function paceHost(url: string) {
	const host = new URL(url).host;
	const wait = (lastRequest.get(host) ?? 0) + SAME_HOST_GAP_MS - Date.now();
	lastRequest.set(host, Date.now() + Math.max(wait, 0));
	if (wait > 0) await sleep(wait);
}

/**
 * Fetches a page or feed as text, with the feed reader's size and time limits. Requests to one host
 * are spaced out, and a "429 Too Many Requests" is retried once after the wait the site asks for.
 */
export async function fetchText(url: string, retry = true): Promise<{ url: string; body: string }> {
	await paceHost(url);
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'SocialSanity/1.0 (feed reader)',
			Accept: 'application/rss+xml, application/atom+xml, application/xml, text/html;q=0.8'
		},
		redirect: 'follow',
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (response.status === 429 && retry) {
		await response.body?.cancel();
		const seconds = Number(response.headers.get('retry-after'));
		await sleep(
			Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 10_000, MAX_RETRY_WAIT_MS)
		);
		return fetchText(url, false);
	}
	const length = Number(response.headers.get('content-length') ?? 0);
	if (!response.ok || length > MAX_BYTES) {
		await response.body?.cancel();
		throw new Error(
			response.ok
				? `${url} is larger than ${MAX_BYTES} bytes.`
				: `${response.status} ${response.statusText} from ${url}`
		);
	}
	const body = await response.text();
	if (body.length > MAX_BYTES) throw new Error(`${url} is larger than ${MAX_BYTES} bytes.`);
	return { url: response.url || url, body };
}

/**
 * Reads one source: its known feed, or the feed its page advertises. A source whose address is
 * itself a feed is read with one request. `prefetched` is the source's address already fetched.
 * A subreddit or Reddit profile is read through the Reddit API when Reddit is connected, since
 * Reddit's public feeds allow only a few requests a minute.
 */
export async function fetchSource(
	source: ContentSource,
	prefetched?: { url: string; body: string }
): Promise<{ ok: boolean; message: string }> {
	try {
		const reddit = parseRedditUrl(source.contentSource);
		if (reddit && isRedditConnected()) {
			const items = await fetchRedditPosts(reddit);
			saveArticles(source.contentSourceId, items);
			const message = `${items.length} post${items.length === 1 ? '' : 's'} read.`;
			recordFetch(source.contentSourceId, { ok: true, message, feedUri: redditFeedUrl(reddit) });
			return { ok: true, message };
		}
		let feedUri =
			source.feedUri ||
			(mediumFeedUrl(source.contentSource) ?? (reddit && redditFeedUrl(reddit)) ?? '');
		let feed = feedUri ? undefined : prefetched;
		if (!feedUri) {
			const page = prefetched ?? (await fetchText(source.contentSource));
			feed = isFeed(page.body) ? page : undefined;
			feedUri = feed ? page.url : (discoverFeed(page.body, page.url) ?? '');
			if (!feedUri) {
				const message = 'No feed found; open the source on its own site.';
				recordFetch(source.contentSourceId, { ok: false, message, feedUri: '' });
				return { ok: false, message };
			}
		}
		feed ??= await fetchText(feedUri);
		const items = parseFeed(feed.body, feed.url);
		saveArticles(source.contentSourceId, items);
		const message = `${items.length} article${items.length === 1 ? '' : 's'} read.`;
		recordFetch(source.contentSourceId, { ok: true, message, feedUri });
		return { ok: true, message };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		recordFetch(source.contentSourceId, { ok: false, message, feedUri: source.feedUri });
		return { ok: false, message };
	}
}

let running: Promise<{ fetched: number; failed: number }> | null = null;

/** Reads every source; a call while a run is in progress joins that run. */
export function fetchAllSources(): Promise<{ fetched: number; failed: number }> {
	running ??= (async () => {
		let fetched = 0;
		let failed = 0;
		for (const source of listSources()) {
			if ((await fetchSource(source)).ok) fetched++;
			else failed++;
		}
		return { fetched, failed };
	})().finally(() => {
		running = null;
	});
	return running;
}

const IMAGE_LOOKUPS_PER_RUN = 40;
const IMAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Visits the pages of recent articles whose feed had no picture and keeps the picture each page
 * offers for link previews. Every page is visited once, found or not.
 */
export async function findPageImages(now = Date.now()): Promise<{ found: number; looked: number }> {
	const articles = listArticlesWithoutImage(now - IMAGE_WINDOW_MS, IMAGE_LOOKUPS_PER_RUN);
	let found = 0;
	for (const article of articles) {
		let image = '';
		try {
			const page = await fetchText(article.url);
			image = pageImage(page.body, page.url) ?? '';
		} catch {
			// Unreachable pages simply get no picture.
		}
		savePageImage(article.articleId, image, now);
		if (image) found++;
	}
	return { found, looked: articles.length };
}
