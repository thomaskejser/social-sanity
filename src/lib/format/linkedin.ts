import { charCount, normalizeText } from './text.ts';
import type { DraftMedia, Issue, PlatformFormat } from './types.ts';

export const LINKEDIN_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const LINKEDIN_VIDEO_TYPES = ['video/mp4'];
const MAX_LENGTH = 3000;
const MAX_IMAGES = 20;

function check(text: string, media: DraftMedia[]): Issue[] {
	const issues: Issue[] = [];
	const length = charCount(text);
	const images = media.filter((m) => m.kind === 'image');
	const videos = media.filter((m) => m.kind === 'video');

	if (length === 0 && media.length === 0) {
		issues.push({ field: 'text', level: 'error', message: 'Add some text or media.' });
	}
	if (length > MAX_LENGTH) {
		issues.push({
			field: 'text',
			level: 'error',
			message: `The text is ${length - MAX_LENGTH} characters over LinkedIn's limit of ${MAX_LENGTH}.`
		});
	}
	if (images.length > 0 && videos.length > 0) {
		issues.push({
			field: 'media',
			level: 'error',
			message: 'LinkedIn posts can have images or one video, not both.'
		});
	}
	if (videos.length > 1) {
		issues.push({
			field: 'media',
			level: 'error',
			message: 'LinkedIn posts can have only one video.'
		});
	}
	if (images.length > MAX_IMAGES) {
		issues.push({
			field: 'media',
			level: 'error',
			message: `LinkedIn posts can have at most ${MAX_IMAGES} images.`
		});
	}
	for (const item of media) {
		const allowed = item.kind === 'image' ? LINKEDIN_IMAGE_TYPES : LINKEDIN_VIDEO_TYPES;
		if (!allowed.includes(item.mimeType)) {
			issues.push({
				field: 'media',
				level: 'error',
				message: `LinkedIn doesn't accept ${item.originalName} (${item.mimeType}); use ${item.kind === 'image' ? 'JPEG, PNG or GIF' : 'MP4'}.`
			});
		}
	}
	return issues;
}

export const linkedin: PlatformFormat = {
	id: 'linkedin',
	name: 'LinkedIn',
	maxLength: MAX_LENGTH,
	foldAt: 210,
	foldLines: 3,
	mediaFirst: false,
	linksClickable: true,
	format: normalizeText,
	check
};
