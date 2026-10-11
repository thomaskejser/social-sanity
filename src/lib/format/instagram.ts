import { charCount, findHashtags, findMentions, findUrls, normalizeText } from './text.ts';
import type { DraftMedia, Issue, PlatformFormat } from './types.ts';

export const INSTAGRAM_IMAGE_TYPES = ['image/jpeg'];
export const INSTAGRAM_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_LENGTH = 2200;
const MAX_HASHTAGS = 30;
const MAX_MENTIONS = 20;
const MAX_CAROUSEL = 10;

const LINK_MARKER = '(link below)';

/** Links in captions are not clickable, so they move to the end. A link inside a sentence
 * leaves a marker; a line holding only links is dropped. */
function format(text: string): string {
	const normalized = normalizeText(text);
	const urls = [...new Set(findUrls(normalized))];
	if (urls.length === 0) return normalized;
	const prose = normalized
		.split('\n')
		.filter((line) => findUrls(line).join(' ') !== line.trim())
		.map((line) => urls.reduce((result, url) => result.split(url).join(LINK_MARKER), line))
		.join('\n');
	return [normalizeText(prose), urls.join('\n')].filter(Boolean).join('\n\n');
}

function check(text: string, media: DraftMedia[]): Issue[] {
	const issues: Issue[] = [];
	const length = charCount(text);
	const hashtags = findHashtags(text).length;
	const mentions = findMentions(text).length;

	if (media.length === 0) {
		issues.push({
			field: 'media',
			level: 'error',
			message: 'Instagram posts need at least one image or video.'
		});
	}
	if (media.length > MAX_CAROUSEL) {
		issues.push({
			field: 'media',
			level: 'error',
			message: `Instagram carousels can have at most ${MAX_CAROUSEL} items.`
		});
	}
	for (const item of media) {
		const allowed = item.kind === 'image' ? INSTAGRAM_IMAGE_TYPES : INSTAGRAM_VIDEO_TYPES;
		if (!allowed.includes(item.mimeType)) {
			issues.push({
				field: 'media',
				level: 'error',
				message:
					item.kind === 'image'
						? `Instagram only accepts JPEG images; convert ${item.originalName} to JPEG.`
						: `Instagram doesn't accept ${item.originalName} (${item.mimeType}); use MP4 or MOV.`
			});
		}
	}
	if (length > MAX_LENGTH) {
		issues.push({
			field: 'text',
			level: 'error',
			message: `The caption is ${length - MAX_LENGTH} characters over Instagram's limit of ${MAX_LENGTH}.`
		});
	}
	if (hashtags > MAX_HASHTAGS) {
		issues.push({
			field: 'text',
			level: 'error',
			message: `Instagram allows at most ${MAX_HASHTAGS} hashtags; this caption has ${hashtags}.`
		});
	}
	if (mentions > MAX_MENTIONS) {
		issues.push({
			field: 'text',
			level: 'error',
			message: `Instagram allows at most ${MAX_MENTIONS} @mentions; this caption has ${mentions}.`
		});
	}
	if (findUrls(text).length > 0) {
		issues.push({
			field: 'text',
			level: 'warning',
			message: 'Links in Instagram captions are not clickable.'
		});
	}
	return issues;
}

export const instagram: PlatformFormat = {
	id: 'instagram',
	name: 'Instagram',
	maxLength: MAX_LENGTH,
	foldAt: 125,
	foldLines: 2,
	mediaFirst: true,
	linksClickable: false,
	format,
	check
};
