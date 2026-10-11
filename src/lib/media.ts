import type { MediaKind } from './format/types.ts';

export const MEDIA_TYPES: Record<string, { kind: MediaKind; extension: string }> = {
	'image/jpeg': { kind: 'image', extension: 'jpg' },
	'image/png': { kind: 'image', extension: 'png' },
	'image/gif': { kind: 'image', extension: 'gif' },
	'video/mp4': { kind: 'video', extension: 'mp4' },
	'video/quicktime': { kind: 'video', extension: 'mov' }
};

export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).join(',');
export const MAX_MEDIA_BYTES = 300 * 1024 * 1024;
export const MAX_MEDIA_FILES = 20;

const MIME_BY_EXTENSION: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	mp4: 'video/mp4',
	mov: 'video/quicktime'
};

/** The media type of a file in the repository, by extension, or undefined when unsupported. */
export function mediaTypeForFile(name: string): { kind: MediaKind; mimeType: string } | undefined {
	const mimeType = MIME_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''];
	return mimeType ? { kind: MEDIA_TYPES[mimeType].kind, mimeType } : undefined;
}

/** Why an uploaded file can't be used, or undefined when it can. */
export function uploadProblem(file: {
	name: string;
	type: string;
	size: number;
}): string | undefined {
	if (!MEDIA_TYPES[file.type]) {
		return `${file.name}: only JPEG, PNG and GIF images and MP4 and MOV videos are supported.`;
	}
	if (file.size === 0) return `${file.name} is empty.`;
	if (file.size > MAX_MEDIA_BYTES) {
		return `${file.name} is larger than ${MAX_MEDIA_BYTES / 1024 / 1024} MB.`;
	}
	return undefined;
}

/** URL path of a media file, given its path inside the posts folder. */
export function mediaUrl(postsPath: string): `/media/${string}` {
	return `/media/${postsPath.split('/').map(encodeURIComponent).join('/')}`;
}
