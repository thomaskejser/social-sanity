import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { mediaTypeForFile } from '#lib/media.ts';
import { getGitRepo, postsRoot } from '#lib/server/repo/store.ts';
import type { RequestHandler } from './$types';

/** Serves media from the posts folder. Supports byte ranges so browsers can seek in videos. */
export const GET: RequestHandler = async ({ params, request }) => {
	const mediaPath = params.path;
	const repo = getGitRepo();
	const type = mediaTypeForFile(mediaPath);
	if (!repo || !type) error(404, 'Not found');
	const root = postsRoot(repo);
	const realRoot = await realpath(root).catch(() => root);
	const filePath = await realpath(path.resolve(root, mediaPath)).catch(() => null);
	if (!filePath?.startsWith(realRoot + path.sep)) error(404, 'Not found');
	const info = await stat(filePath).catch(() => null);
	if (!info?.isFile()) error(404, 'Not found');

	const headers = new Headers({
		'Content-Type': type.mimeType,
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'private, max-age=300'
	});

	const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
	if (range && (range[1] || range[2])) {
		const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
		const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
		if (start > end || start >= info.size) {
			return new Response(null, {
				status: 416,
				headers: { 'Content-Range': `bytes */${info.size}` }
			});
		}
		headers.set('Content-Range', `bytes ${start}-${end}/${info.size}`);
		headers.set('Content-Length', String(end - start + 1));
		const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
		return new Response(stream, { status: 206, headers });
	}

	headers.set('Content-Length', String(info.size));
	return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, { headers });
};
