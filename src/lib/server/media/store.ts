import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MEDIA_DIR } from '$app/env/private';
import type { MediaKind } from '#lib/format/types.ts';
import { isMediaFileName, MEDIA_TYPES, uploadProblem } from '#lib/media.ts';

export type StoredMedia = {
	kind: MediaKind;
	mimeType: string;
	fileName: string;
	originalName: string;
	size: number;
};

export function mediaPath(fileName: string): string {
	if (!isMediaFileName(fileName)) throw new Error(`Invalid media file name: ${fileName}`);
	return path.resolve(MEDIA_DIR, fileName);
}

export async function saveUpload(file: File): Promise<StoredMedia> {
	const problem = uploadProblem(file);
	if (problem) throw new Error(problem);
	const type = MEDIA_TYPES[file.type];
	const fileName = `${randomUUID()}.${type.extension}`;
	await mkdir(path.resolve(MEDIA_DIR), { recursive: true });
	await writeFile(mediaPath(fileName), Buffer.from(await file.arrayBuffer()));
	return {
		kind: type.kind,
		mimeType: file.type,
		fileName,
		originalName: file.name,
		size: file.size
	};
}

export function readMedia(fileName: string): Promise<Buffer> {
	return readFile(mediaPath(fileName));
}

export async function deleteMedia(fileNames: string[]) {
	await Promise.all(fileNames.map((name) => rm(mediaPath(name), { force: true })));
}
