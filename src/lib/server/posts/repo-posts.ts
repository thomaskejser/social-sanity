import { mkdir, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PLATFORMS, platformFormat, type PlatformId } from '#lib/format/index.ts';
import { normalizeText } from '#lib/format/text.ts';
import { MEDIA_TYPES, mediaTypeForFile, uploadProblem } from '#lib/media.ts';
import {
	newPostSource,
	parsePostFile,
	safeFileName,
	setPlatformText,
	setPublished,
	slugify,
	type PostFile,
	type PublishedState
} from '#lib/posts/markdown.ts';
import type { GitRepo } from '../db/types.ts';
import { commitAndPush, ensureClone, sync, withRepoLock } from '../repo/git.ts';
import { cloneDir, gitContext, postsRoot } from '../repo/store.ts';

export type PostMediaFile = {
	kind: 'image' | 'video';
	mimeType: string;
	originalName: string;
	/** Path inside the posts folder, with forward slashes. */
	postsPath: string;
	absolutePath: string;
	size: number;
};

export type RepoPost = {
	id: string;
	/** Path of the Markdown file inside the repository. */
	repoPath: string;
	parsed: PostFile;
	media: PostMediaFile[];
	/** Problems that make the post unusable as written, e.g. a missing media file. */
	problems: string[];
};

export type PostSummary = {
	id: string;
	title: string | null;
	date: string | null;
	text: string;
	mediaCount: number;
	published: PlatformId[];
	error: string | null;
};

export type WriteResult = { pushError: string | null };

const MAX_DEPTH = 4;
const toPosix = (p: string) => p.split(path.sep).join('/');

function idForFile(relative: string): string {
	return toPosix(relative)
		.replace(/\.md$/i, '')
		.replace(/(^|\/)index$/i, '');
}

function isSafeId(id: string): boolean {
	return id !== '' && id.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
}

async function exists(file: string): Promise<boolean> {
	return stat(file).then(
		() => true,
		() => false
	);
}

async function findMarkdownFiles(dir: string, depth = 0): Promise<string[]> {
	if (depth > MAX_DEPTH) return [];
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
	const files: string[] = [];
	for (const entry of entries) {
		if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await findMarkdownFiles(full, depth + 1)));
		else if (/\.md$/i.test(entry.name) && !/^readme\.md$/i.test(entry.name)) files.push(full);
	}
	return files;
}

async function fileForId(repo: GitRepo, id: string): Promise<string | null> {
	if (!isSafeId(id)) return null;
	const root = postsRoot(repo);
	for (const candidate of [`${id}.md`, `${id}/index.md`]) {
		const file = path.join(root, candidate);
		if (file.startsWith(root + path.sep) && (await exists(file))) return file;
	}
	return null;
}

async function resolveMedia(repo: GitRepo, file: string, parsed: PostFile) {
	const root = postsRoot(repo);
	const realRoot = await realpath(root).catch(() => root);
	const media: PostMediaFile[] = [];
	const problems: string[] = [];
	for (const ref of parsed.media) {
		if (/^[a-z][a-z0-9+.-]*:/i.test(ref.src)) {
			problems.push(`Media must be a file in the repository, not a link: ${ref.src}`);
			continue;
		}
		const absolutePath = path.resolve(path.dirname(file), ref.src);
		if (!absolutePath.startsWith(root + path.sep)) {
			problems.push(`Media must be inside the posts folder: ${ref.src}`);
			continue;
		}
		const type = mediaTypeForFile(absolutePath);
		if (!type) {
			problems.push(`Unsupported media type: ${ref.src}`);
			continue;
		}
		const real = await realpath(absolutePath).catch(() => null);
		const info = real ? await stat(real).catch(() => null) : null;
		if (!real || !info?.isFile()) {
			problems.push(`Media file not found: ${ref.src}`);
			continue;
		}
		if (!real.startsWith(realRoot + path.sep)) {
			problems.push(`Media must be inside the posts folder: ${ref.src}`);
			continue;
		}
		media.push({
			...type,
			originalName: path.basename(absolutePath),
			postsPath: toPosix(path.relative(root, absolutePath)),
			absolutePath,
			size: info.size
		});
	}
	return { media, problems };
}

export async function getPost(repo: GitRepo, id: string): Promise<RepoPost | null> {
	const file = await fileForId(repo, id);
	if (!file) return null;
	const parsed = parsePostFile(await readFile(file, 'utf8'));
	return {
		id,
		repoPath: toPosix(path.relative(cloneDir(), file)),
		parsed,
		...(await resolveMedia(repo, file, parsed))
	};
}

function datePrefix(id: string): string | null {
	return /^(\d{4}-\d{2}-\d{2})/.exec(id.split('/').pop() ?? '')?.[1] ?? null;
}

export async function listPosts(repo: GitRepo): Promise<PostSummary[]> {
	const root = postsRoot(repo);
	const summaries: PostSummary[] = [];
	for (const file of await findMarkdownFiles(root)) {
		const id = idForFile(path.relative(root, file));
		try {
			const parsed = parsePostFile(await readFile(file, 'utf8'));
			summaries.push({
				id,
				title: parsed.title,
				date: parsed.date ?? datePrefix(id),
				text: parsed.text,
				mediaCount: parsed.media.length,
				published: PLATFORMS.filter((p) => parsed.platforms[p.id]?.published).map((p) => p.id),
				error: null
			});
		} catch (error) {
			summaries.push({
				id,
				title: null,
				date: datePrefix(id),
				text: '',
				mediaCount: 0,
				published: [],
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	return summaries.sort(
		(a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id.localeCompare(a.id)
	);
}

/** The text that is published to `platform`: the file's override, or the formatted body. */
export function platformText(post: RepoPost, platform: PlatformId): string {
	return post.parsed.platforms[platform]?.text ?? platformFormat(platform).format(post.parsed.text);
}

function uploadName(file: File, taken: Set<string>): string {
	const canonical = MEDIA_TYPES[file.type].extension;
	const matches = mediaTypeForFile(file.name)?.mimeType === file.type;
	return safeFileName(matches ? file.name : `${file.name}.${canonical}`, taken);
}

/** Writes a new post folder (index.md plus media) into the repository, commits and pushes. */
export function createPost(
	repo: GitRepo,
	post: { title: string; text: string; files: File[] },
	now = new Date()
): Promise<WriteResult & { id: string }> {
	for (const file of post.files) {
		const problem = uploadProblem(file);
		if (problem) throw new Error(problem);
	}
	return withRepoLock(async () => {
		const ctx = gitContext(repo);
		await ensureClone(ctx);
		await sync(ctx).catch(() => undefined);

		const date = now.toISOString().slice(0, 10);
		const words = post.text.split(/\s+/).slice(0, 6).join(' ');
		const slug = slugify(post.title || words) || 'post';
		const root = postsRoot(repo);
		let id = `${date}-${slug}`;
		for (let n = 2; await exists(path.join(root, id)); n++) id = `${date}-${slug}-${n}`;
		const folder = path.join(root, id);
		await mkdir(folder, { recursive: true });

		const taken = new Set(['index.md']);
		const mediaFiles: string[] = [];
		for (const file of post.files) {
			const name = uploadName(file, taken);
			await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
			mediaFiles.push(name);
		}
		await writeFile(
			path.join(folder, 'index.md'),
			newPostSource({ title: post.title || null, date, text: post.text, mediaFiles })
		);
		const { pushError } = await commitAndPush(
			ctx,
			[toPosix(path.relative(cloneDir(), folder))],
			`Add post ${id}`
		);
		return { id, pushError };
	});
}

async function rewritePost(
	repo: GitRepo,
	id: string,
	edit: (source: string, post: RepoPost) => string,
	message: string | (() => string)
): Promise<WriteResult & { changed: boolean }> {
	return withRepoLock(async () => {
		const post = await getPost(repo, id);
		if (!post) throw new Error(`Post ${id} not found in the repository.`);
		const file = path.join(cloneDir(), post.repoPath);
		const source = await readFile(file, 'utf8');
		const updated = edit(source, post);
		if (updated === source) return { changed: false, pushError: null };
		await writeFile(file, updated);
		const { pushError } = await commitAndPush(
			gitContext(repo),
			[post.repoPath],
			typeof message === 'string' ? message : message()
		);
		return { changed: true, pushError };
	});
}

/** Stores per-platform texts. A text equal to the generated one removes the override; published
 * platforms keep the text they were published with. */
export function savePlatformTexts(
	repo: GitRepo,
	id: string,
	texts: Partial<Record<PlatformId, string>>
): Promise<WriteResult & { changed: boolean }> {
	const changed: string[] = [];
	return rewritePost(
		repo,
		id,
		(source, post) => {
			let result = source;
			for (const [platform, text] of Object.entries(texts) as [PlatformId, string][]) {
				if (post.parsed.platforms[platform]?.published) continue;
				const generated = platformFormat(platform).format(post.parsed.text);
				const value = normalizeText(text) === generated ? null : text.replace(/\s+$/u, '');
				const next = setPlatformText(result, platform, value);
				if (next !== result) changed.push(platformFormat(platform).name);
				result = next;
			}
			return result;
		},
		() => `Edit ${id}: ${changed.join(' and ')} text`
	);
}

export function recordPublished(
	repo: GitRepo,
	id: string,
	platform: PlatformId,
	state: PublishedState
): Promise<WriteResult & { changed: boolean }> {
	return rewritePost(
		repo,
		id,
		(source) => setPublished(source, platform, state),
		`Publish ${id} to ${platformFormat(platform).name}`
	);
}

/** Removes the post from the repository: its folder for index.md posts, else just the file. */
export function deletePost(repo: GitRepo, id: string): Promise<WriteResult> {
	return withRepoLock(async () => {
		const post = await getPost(repo, id);
		if (!post) throw new Error(`Post ${id} not found in the repository.`);
		const file = path.join(cloneDir(), post.repoPath);
		const isFolder = path.basename(file).toLowerCase() === 'index.md';
		const target = isFolder ? path.dirname(file) : file;
		await rm(target, { recursive: true, force: true });
		return commitAndPush(
			gitContext(repo),
			[toPosix(path.relative(cloneDir(), target))],
			`Delete post ${id}`
		);
	});
}
