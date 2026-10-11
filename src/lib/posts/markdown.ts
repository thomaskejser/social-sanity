import { Document, isMap, parseDocument } from 'yaml';
import { normalizeText } from '../format/text.ts';
import type { PlatformId } from '../format/types.ts';

export class PostFormatError extends Error {}

export type PublishedState = { url: string | null; id: string; publishedAt: string };

export type PlatformState = {
	/** Per-platform text that replaces the text generated from the body. */
	text?: string;
	published?: PublishedState;
};

export type MediaRef = { alt: string; src: string };

export type PostFile = {
	title: string | null;
	date: string | null;
	/** The body as plain text for social platforms: Markdown removed, media lines dropped. */
	text: string;
	media: MediaRef[];
	platforms: Partial<Record<PlatformId, PlatformState>>;
};

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/;
/** Escaped Markdown characters are parked in the Private Use Area while markup is removed. */
const ESCAPE_BASE = 0xe000;
const MEDIA = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

export function splitFrontMatter(source: string): { yaml: string | null; body: string } {
	const match = FRONT_MATTER.exec(source);
	if (!match) return { yaml: null, body: source };
	return { yaml: match[1], body: source.slice(match[0].length) };
}

function parseYaml(yaml: string | null): Document {
	if (yaml === null || yaml.trim() === '') return new Document({});
	const doc = parseDocument(yaml);
	if (doc.errors.length > 0) {
		throw new PostFormatError(`Invalid front matter: ${doc.errors[0].message}`);
	}
	if (doc.contents !== null && !isMap(doc.contents)) {
		throw new PostFormatError('Front matter must be a set of key: value pairs.');
	}
	return doc;
}

/** Converts Markdown to the plain text social platforms show. Links keep their URL, since
 * platforms link URLs themselves; HTML comments are dropped so they can hold private notes. */
export function markdownToPlain(markdown: string): string {
	const text = markdown
		.replace(/\\([\\`*_{}[\]()#+\-.!>])/g, (_, char: string) =>
			String.fromCodePoint(ESCAPE_BASE + char.codePointAt(0)!)
		)
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
		.replace(
			/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g,
			(_, label: string, url: string) => (label === url ? url : `${label} ${url}`)
		)
		.split('\n')
		.map((line) =>
			line
				.replace(/^\s{0,3}#{1,6}\s+/, '')
				.replace(/^\s{0,3}>\s?/, '')
				.replace(/^\s{0,3}([-*_])(\s*\1){2,}\s*$/, '')
				.replace(/^(\s*)[-*+]\s+/, '$1• ')
		)
		.join('\n')
		.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '$1')
		.replace(/__(?=\S)(.+?)(?<=\S)__/g, '$1')
		.replace(/(?<![\w*])\*(?=\S)(.+?)(?<=\S)\*(?![\w*])/g, '$1')
		.replace(/(?<![\p{L}\p{N}_])_(?=\S)(.+?)(?<=\S)_(?![\p{L}\p{N}_])/gu, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/[\uE000-\uE07F]/g, (char) =>
			String.fromCodePoint(char.codePointAt(0)! - ESCAPE_BASE)
		);
	return normalizeText(text);
}

function readString(value: unknown): string | null {
	if (typeof value === 'string') return value;
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return null;
}

function readPlatforms(value: unknown): PostFile['platforms'] {
	const platforms: PostFile['platforms'] = {};
	if (typeof value !== 'object' || value === null) return platforms;
	for (const id of ['linkedin', 'instagram'] as const) {
		const raw = (value as Record<string, unknown>)[id];
		if (typeof raw !== 'object' || raw === null) continue;
		const entry = raw as Record<string, unknown>;
		const state: PlatformState = {};
		if (typeof entry.text === 'string') state.text = entry.text;
		const id_ = readString(entry.id);
		if (id_) {
			state.published = {
				id: id_,
				url: readString(entry.url),
				publishedAt: readString(entry.publishedAt) ?? ''
			};
		}
		platforms[id] = state;
	}
	return platforms;
}

export function parsePostFile(source: string): PostFile {
	const { yaml, body } = splitFrontMatter(source);
	const data = (parseYaml(yaml).toJS() ?? {}) as Record<string, unknown>;
	const media: MediaRef[] = [];
	const withoutMedia = body
		.split('\n')
		.map((line) => {
			const stripped = line.replace(MEDIA, (_, alt: string, src: string) => {
				media.push({ alt, src: decodeURI(src) });
				return '';
			});
			return stripped !== line && stripped.trim() === '' ? null : stripped;
		})
		.filter((line) => line !== null)
		.join('\n');
	return {
		title: readString(data.title),
		date: readString(data.date),
		text: markdownToPlain(withoutMedia),
		media,
		platforms: readPlatforms(data.platforms)
	};
}

function joinFrontMatter(doc: Document, body: string): string {
	const contents = doc.contents;
	if (!isMap(contents) || contents.items.length === 0) return body;
	return `---\n${doc.toString({ lineWidth: 0 })}---\n${body}`;
}

function pruneEmpty(doc: Document, path: (string | number)[]) {
	for (let depth = path.length; depth > 0; depth--) {
		const node = doc.getIn(path.slice(0, depth));
		if (isMap(node) && node.items.length === 0) doc.deleteIn(path.slice(0, depth));
	}
}

/** Sets (or, with null, removes) a platform's text override, keeping the rest of the file as is. */
export function setPlatformText(source: string, platform: PlatformId, text: string | null): string {
	const { yaml, body } = splitFrontMatter(source);
	const doc = parseYaml(yaml);
	if (text === null) {
		if (!doc.hasIn(['platforms', platform, 'text'])) return source;
		doc.deleteIn(['platforms', platform, 'text']);
		pruneEmpty(doc, ['platforms', platform]);
	} else {
		doc.setIn(['platforms', platform, 'text'], text);
	}
	return joinFrontMatter(doc, body);
}

export function setPublished(source: string, platform: PlatformId, state: PublishedState): string {
	const { yaml, body } = splitFrontMatter(source);
	const doc = parseYaml(yaml);
	doc.setIn(['platforms', platform, 'url'], state.url);
	doc.setIn(['platforms', platform, 'id'], state.id);
	doc.setIn(['platforms', platform, 'publishedAt'], state.publishedAt);
	return joinFrontMatter(doc, body);
}

export function newPostSource(post: {
	title: string | null;
	date: string;
	text: string;
	mediaFiles: string[];
}): string {
	const doc = new Document({ ...(post.title ? { title: post.title } : {}), date: post.date });
	const media = post.mediaFiles.map((name) => `![](${encodeURI(name)})`).join('\n');
	const body = [post.text.trim(), media].filter(Boolean).join('\n\n') + '\n';
	return joinFrontMatter(doc, body);
}

export function slugify(value: string, maxLength = 60): string {
	const slug = value
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxLength)
		.replace(/-+$/g, '');
	return slug;
}

/** A safe file name for an upload: slugified base name plus a lower-case extension. */
export function safeFileName(original: string, taken: Set<string>): string {
	const baseName = original.split(/[\\/]/).pop() ?? '';
	const dot = baseName.lastIndexOf('.');
	const candidate = dot > 0 ? baseName.slice(dot + 1).toLowerCase() : '';
	const extension = /^[a-z0-9]{1,8}$/.test(candidate) ? candidate : '';
	const base = slugify(extension ? baseName.slice(0, dot) : baseName) || 'file';
	let name = extension ? `${base}.${extension}` : base;
	for (let n = 2; taken.has(name); n++)
		name = extension ? `${base}-${n}.${extension}` : `${base}-${n}`;
	taken.add(name);
	return name;
}
