export type PlatformId = 'linkedin' | 'instagram';

export type MediaKind = 'image' | 'video';

export type DraftMedia = { kind: MediaKind; mimeType: string; originalName: string };

export type Issue = { level: 'error' | 'warning'; field: 'text' | 'media'; message: string };

export type PlatformFormat = {
	id: PlatformId;
	name: string;
	maxLength: number;
	/** Characters shown before the platform folds the text behind "… more". */
	foldAt: number;
	/** Lines shown before the fold. */
	foldLines: number;
	mediaFirst: boolean;
	linksClickable: boolean;
	/** Turns the shared draft text into this platform's text. */
	format(text: string): string;
	/** Problems with this platform's text and media; any `error` blocks publishing. */
	check(text: string, media: DraftMedia[]): Issue[];
};
