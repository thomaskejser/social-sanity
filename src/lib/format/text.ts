const URL_PATTERN = /\bhttps?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'}]/gu;
const HASHTAG_PATTERN = /(?<![\p{L}\p{N}_&/])#[\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*/gu;
const MENTION_PATTERN = /(?<![\p{L}\p{N}_.])@[\p{L}\p{N}_.]+[\p{L}\p{N}_]/gu;

/** Length as the platforms count it: Unicode code points, not UTF-16 units. */
export function charCount(text: string): number {
	return Array.from(text).length;
}

/** Trims, unifies line endings, strips trailing spaces and collapses runs of blank lines. */
export function normalizeText(text: string): string {
	return text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/u, ''))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function findUrls(text: string): string[] {
	return text.match(URL_PATTERN) ?? [];
}

export function findHashtags(text: string): string[] {
	return text.match(HASHTAG_PATTERN) ?? [];
}

export function findMentions(text: string): string[] {
	return text.match(MENTION_PATTERN) ?? [];
}

export type TextToken = { kind: 'text' | 'link' | 'hashtag' | 'mention'; value: string };

/** Splits text into plain runs, links, hashtags and mentions, for rendering a preview. */
export function tokenize(text: string): TextToken[] {
	const pattern = new RegExp(
		`(${URL_PATTERN.source})|(${HASHTAG_PATTERN.source})|(${MENTION_PATTERN.source})`,
		'gu'
	);
	const tokens: TextToken[] = [];
	let last = 0;
	for (const match of text.matchAll(pattern)) {
		if (match.index > last) tokens.push({ kind: 'text', value: text.slice(last, match.index) });
		const kind = match[1] ? 'link' : match[2] ? 'hashtag' : 'mention';
		tokens.push({ kind, value: match[0] });
		last = match.index + match[0].length;
	}
	if (last < text.length) tokens.push({ kind: 'text', value: text.slice(last) });
	return tokens;
}

/** The part of `text` shown before the platform's "… more" fold, or null when it all fits. */
export function foldText(text: string, maxChars: number, maxLines: number): string | null {
	const byLines = text.split('\n').slice(0, maxLines).join('\n');
	const chars = Array.from(byLines);
	if (chars.length <= maxChars) return byLines.length < text.length ? byLines.trimEnd() : null;
	const shown = chars.slice(0, maxChars).join('');
	const cutMidWord = /\S/u.test(chars[maxChars]);
	return (cutMidWord ? shown.replace(/\s+\S*$/u, '') : shown).trimEnd() || shown;
}
