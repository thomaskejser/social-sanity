import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { isMediaFileName, MEDIA_TYPES } from '#lib/media.ts';
import { mediaPath } from '#lib/server/media/store.ts';
import type { RequestHandler } from './$types';

const MIME_BY_EXTENSION = Object.fromEntries(
	Object.entries(MEDIA_TYPES).map(([mime, { extension }]) => [extension, mime])
);

/** Serves uploaded media, with byte ranges so browsers can seek in videos. */
export const GET: RequestHandler = async ({ params, request }) => {
	if (!isMediaFileName(params.file)) error(404, 'Not found');
	const filePath = mediaPath(params.file);
	const info = await stat(filePath).catch(() => null);
	if (!info?.isFile()) error(404, 'Not found');

	const headers = new Headers({
		'Content-Type': MIME_BY_EXTENSION[params.file.split('.').pop()!],
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'public, max-age=31536000, immutable'
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
