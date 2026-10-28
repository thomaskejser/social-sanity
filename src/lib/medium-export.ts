import { mediumFeedUrl } from './medium.ts';

/** A writer or publication found in a Medium data export. */
export type MediumFollow = {
	kind: 'writer' | 'publication';
	name: string;
	/** The profile or publication address as it appears in the export. */
	url: string;
	feedUrl: string;
};

export type ExportFile = { path: string; html: string };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(value: string): string {
	return value.replace(/&(#\d+|[a-z]+);/gi, (match, code: string) =>
		code[0] === '#' ? String.fromCodePoint(Number(code.slice(1))) : (ENTITIES[code] ?? match)
	);
}

function plain(html: string): string {
	return decode(html.replace(/<[^>]*>/g, ' '))
		.replace(/\s+/g, ' ')
		.trim();
}

/** Whether the address is a writer's profile rather than a publication. */
function isWriter(url: URL): boolean {
	const host = url.hostname.replace(/^www\./, '');
	return host === 'medium.com' ? url.pathname.startsWith('/@') : host.endsWith('.medium.com');
}

/** The feed of a publication on its own domain, e.g. https://python.plainenglish.io/feed. */
function customDomainFeed(url: URL): string | undefined {
	if (url.protocol !== 'https:' || url.hostname.endsWith('medium.com')) return undefined;
	return `${url.origin}/feed`;
}

/**
 * The writers and publications listed in the files of a Medium export whose path mentions
 * following. Each is recognised by a link to its medium.com address, or, in the publications
 * file, to the publication's own domain; the same feed is listed once.
 */
export function findFollows(files: ExportFile[]): MediumFollow[] {
	const follows = new Map<string, MediumFollow>();
	for (const file of files) {
		if (!/follow/i.test(file.path)) continue;
		const publications = /pub/i.test(file.path);
		for (const [, rawHref, text] of file.html.matchAll(
			/<a\b[^>]*\bhref="([^"]+)"[^>]*>([^]*?)<\/a>/gi
		)) {
			const href = decode(rawHref);
			let url: URL;
			try {
				url = new URL(href);
			} catch {
				continue;
			}
			const feedUrl = mediumFeedUrl(href) ?? (publications ? customDomainFeed(url) : undefined);
			if (!feedUrl || follows.has(feedUrl)) continue;
			const writer = !publications && isWriter(url);
			follows.set(feedUrl, {
				kind: writer ? 'writer' : 'publication',
				name: plain(text).replace(/^@/, '') || url.hostname,
				url: href,
				feedUrl
			});
		}
	}
	return [...follows.values()];
}

/** The name in a Medium feed's title, e.g. "Stories by Ada Lovelace on Medium" gives "Ada Lovelace". */
export function feedTitleName(title: string): string {
	return title
		.replace(/^Stories by /i, '')
		.replace(/ on Medium$/i, '')
		.replace(/ - Medium$/i, '')
		.trim();
}

/** The folders of an archive with how many files each holds, for showing what an export contains. */
export function describeArchive(paths: string[]): { folder: string; files: number }[] {
	const counts = new Map<string, number>();
	for (const path of paths) {
		if (path.endsWith('/')) continue;
		const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '(top level)';
		counts.set(folder, (counts.get(folder) ?? 0) + 1);
	}
	return [...counts]
		.map(([folder, files]) => ({ folder, files }))
		.sort((a, b) => a.folder.localeCompare(b.folder));
}
