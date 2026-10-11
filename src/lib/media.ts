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

const FILE_NAME =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|mp4|mov)$/;

export function isMediaFileName(name: string): boolean {
	return FILE_NAME.test(name);
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

export function mediaUrl(fileName: string): `/media/${string}` {
	return `/media/${fileName}`;
}
