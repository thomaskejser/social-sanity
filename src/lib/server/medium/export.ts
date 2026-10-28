import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';
import { SOCIAL_SANITY_DATABASE_URL } from '$app/env/private';
import { describeArchive, findFollows, type MediumFollow } from '#lib/medium-export.ts';

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_HTML_BYTES = 200 * 1024 * 1024;

export class MediumExportError extends Error {}

export type MediumExport = {
	/** Where the archive is kept, next to the database. */
	savedAs: string;
	folders: { folder: string; files: number }[];
	follows: MediumFollow[];
};

/**
 * Reads a Medium data export: lists its folders and the writers and publications it says the user
 * follows. Only the HTML files are unpacked, up to a total size, so a crafted archive cannot fill
 * memory. The archive is kept under `imports/medium/` beside the database for a later import.
 */
export function readMediumExport(archive: Uint8Array, now = Date.now()): MediumExport {
	if (archive.length > MAX_ARCHIVE_BYTES)
		throw new MediumExportError('The archive is larger than 100 MB; is it the Medium export?');
	const paths: string[] = [];
	let htmlBytes = 0;
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(archive, {
			filter: (file) => {
				paths.push(file.name);
				if (!/\.html?$/i.test(file.name)) return false;
				htmlBytes += file.originalSize;
				if (htmlBytes > MAX_HTML_BYTES)
					throw new MediumExportError('The archive unpacks to more than 200 MB of pages.');
				return true;
			}
		});
	} catch (error) {
		if (error instanceof MediumExportError) throw error;
		throw new MediumExportError('That file is not a ZIP archive.');
	}
	const decoder = new TextDecoder();
	const pages = Object.entries(files).map(([path, bytes]) => ({
		path,
		html: decoder.decode(bytes)
	}));

	const folder = join(dirname(SOCIAL_SANITY_DATABASE_URL), 'imports', 'medium');
	mkdirSync(folder, { recursive: true });
	const savedAs = join(folder, `medium-export-${now}.zip`);
	writeFileSync(savedAs, archive);

	return { savedAs, folders: describeArchive(paths), follows: findFollows(pages) };
}
