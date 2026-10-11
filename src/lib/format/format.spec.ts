import { describe, expect, it } from 'vitest';
import { checkPost, hasErrors } from './index.ts';
import { instagram } from './instagram.ts';
import { linkedin } from './linkedin.ts';
import { charCount, findHashtags, foldText, normalizeText, tokenize } from './text.ts';
import type { DraftMedia } from './types.ts';

const jpeg: DraftMedia = { kind: 'image', mimeType: 'image/jpeg', originalName: 'a.jpg' };
const png: DraftMedia = { kind: 'image', mimeType: 'image/png', originalName: 'b.png' };
const mp4: DraftMedia = { kind: 'video', mimeType: 'video/mp4', originalName: 'c.mp4' };
const mov: DraftMedia = { kind: 'video', mimeType: 'video/quicktime', originalName: 'd.mov' };

const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');

describe('text helpers', () => {
	it('normalizes whitespace and blank lines', () => {
		expect(normalizeText('  Hello  \r\n\r\n\r\n\r\nWorld \t\n')).toBe('Hello\n\nWorld');
	});

	it('counts code points, not UTF-16 units', () => {
		expect(charCount('👋🏽 hi')).toBe(5);
	});

	it('finds hashtags but not anchors, C# or numbers', () => {
		expect(findHashtags('Love #svelte and #web_dev, not C# or #123 or a/#b')).toEqual([
			'#svelte',
			'#web_dev'
		]);
	});

	it('tokenizes links, hashtags and mentions', () => {
		expect(tokenize('See https://ex.com/a. Thanks @ann #ok')).toEqual([
			{ kind: 'text', value: 'See ' },
			{ kind: 'link', value: 'https://ex.com/a' },
			{ kind: 'text', value: '. Thanks ' },
			{ kind: 'mention', value: '@ann' },
			{ kind: 'text', value: ' ' },
			{ kind: 'hashtag', value: '#ok' }
		]);
	});

	it('folds long text at a word boundary and keeps short text whole', () => {
		expect(foldText('short', 10, 3)).toBeNull();
		expect(foldText('one two three four', 10, 3)).toBe('one two');
		expect(foldText('a\nb\nc\nd', 100, 2)).toBe('a\nb');
	});
});

describe('LinkedIn', () => {
	it('keeps the text, normalized', () => {
		expect(linkedin.format('Hello https://ex.com  \n\n\n\n#tag')).toBe(
			'Hello https://ex.com\n\n#tag'
		);
	});

	it('accepts text-only posts and up to 20 images', () => {
		expect(linkedin.check('Hi', [])).toEqual([]);
		expect(linkedin.check('Hi', Array(20).fill(jpeg))).toEqual([]);
		expect(hasErrors(linkedin.check('Hi', Array(21).fill(jpeg)))).toBe(true);
	});

	it('rejects empty posts, overlong text, mixed media and unsupported types', () => {
		expect(messages(linkedin.check('', []))).toMatch(/Add some text or media/);
		expect(messages(linkedin.check('x'.repeat(3001), []))).toMatch(/1 characters over/);
		expect(messages(linkedin.check('Hi', [jpeg, mp4]))).toMatch(/not both/);
		expect(messages(linkedin.check('Hi', [mp4, mp4]))).toMatch(/only one video/);
		expect(messages(linkedin.check('Hi', [mov]))).toMatch(/use MP4/);
	});
});

describe('Instagram', () => {
	it('moves links to the end of the caption', () => {
		expect(instagram.format('Read https://ex.com/post today. #news')).toBe(
			'Read (link below) today. #news\n\nhttps://ex.com/post'
		);
		expect(instagram.format('Hello\n\nSee https://a.com\n\nBye')).toBe(
			'Hello\n\nSee (link below)\n\nBye\n\nhttps://a.com'
		);
		expect(instagram.format('Two links:\nhttps://a.com https://b.com\nBye')).toBe(
			'Two links:\nBye\n\nhttps://a.com\nhttps://b.com'
		);
	});

	it('keeps captions without links unchanged apart from normalizing', () => {
		expect(instagram.format(' Sunset 🌅\n\n\n#sky ')).toBe('Sunset 🌅\n\n#sky');
	});

	it('requires media and limits carousels to 10', () => {
		expect(messages(instagram.check('Hi', []))).toMatch(/at least one image or video/);
		expect(instagram.check('Hi', Array(10).fill(jpeg))).toEqual([]);
		expect(messages(instagram.check('Hi', Array(11).fill(jpeg)))).toMatch(/at most 10/);
	});

	it('accepts JPEG, MP4 and MOV but not PNG', () => {
		expect(instagram.check('Hi', [jpeg, mp4, mov])).toEqual([]);
		expect(messages(instagram.check('Hi', [png]))).toMatch(/convert b.png to JPEG/);
	});

	it('limits caption length, hashtags and mentions', () => {
		expect(messages(instagram.check('x'.repeat(2201), [jpeg]))).toMatch(/1 characters over/);
		const tags = Array.from({ length: 31 }, (_, i) => `#t${i}a`).join(' ');
		expect(messages(instagram.check(tags, [jpeg]))).toMatch(/this caption has 31/);
		const people = Array.from({ length: 21 }, (_, i) => `@p${i}`).join(' ');
		expect(messages(instagram.check(people, [jpeg]))).toMatch(/@mentions; this caption has 21/);
	});

	it('warns, without blocking, about links', () => {
		const issues = checkPost('instagram', 'See https://ex.com', [jpeg]);
		expect(issues).toEqual([
			{
				field: 'text',
				level: 'warning',
				message: 'Links in Instagram captions are not clickable.'
			}
		]);
		expect(hasErrors(issues)).toBe(false);
	});
});
