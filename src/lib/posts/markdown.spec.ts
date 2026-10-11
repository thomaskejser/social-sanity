import { describe, expect, it } from 'vitest';
import {
	markdownToPlain,
	newPostSource,
	parsePostFile,
	PostFormatError,
	safeFileName,
	setPlatformText,
	setPublished,
	slugify
} from './markdown.ts';

const source = `---
title: Dashboard launch
date: 2026-10-11
# a comment the app must keep
platforms:
  instagram:
    text: |
      Big news! (link below)
      #launch
---
# We shipped it

Big news from the **team**! Read [the story](https://ex.com/blog) and *enjoy*.

![Sunset over the office](sunset.jpg)
![](clip%20one.mp4)

- fast
- small
<!-- private note -->
`;

describe('parsePostFile', () => {
	it('reads front matter, plain text and media in order', () => {
		const post = parsePostFile(source);
		expect(post.title).toBe('Dashboard launch');
		expect(post.date).toBe('2026-10-11');
		expect(post.text).toBe(
			'We shipped it\n\nBig news from the team! Read the story https://ex.com/blog and enjoy.\n\n• fast\n• small'
		);
		expect(post.media).toEqual([
			{ alt: 'Sunset over the office', src: 'sunset.jpg' },
			{ alt: '', src: 'clip one.mp4' }
		]);
		expect(post.platforms).toEqual({ instagram: { text: 'Big news! (link below)\n#launch\n' } });
	});

	it('reads published state', () => {
		const post = parsePostFile(
			'---\nplatforms:\n  linkedin:\n    url: https://li/x\n    id: urn:li:share:1\n    publishedAt: 2026-10-11T10:00:00Z\n---\nHi'
		);
		expect(post.platforms.linkedin?.published).toEqual({
			url: 'https://li/x',
			id: 'urn:li:share:1',
			publishedAt: '2026-10-11T10:00:00Z'
		});
	});

	it('accepts files without front matter and rejects broken front matter', () => {
		expect(parsePostFile('Just text').text).toBe('Just text');
		expect(() => parsePostFile('---\ntitle: [unclosed\n---\nx')).toThrow(PostFormatError);
		expect(() => parsePostFile('---\n- a list\n---\nx')).toThrow(/key: value/);
	});
});

describe('markdownToPlain', () => {
	it('keeps hashtags at line start and snake_case words', () => {
		expect(markdownToPlain('#launch day for my_var_name')).toBe('#launch day for my_var_name');
	});

	it('unwraps autolinks, code and escapes, and drops rules', () => {
		expect(markdownToPlain('See <https://a.com> `npm i` \\*not bold\\*\n\n---\n\nEnd')).toBe(
			'See https://a.com npm i *not bold*\n\nEnd'
		);
	});
});

describe('editing front matter', () => {
	it('sets and clears a text override while keeping comments and the body', () => {
		const edited = setPlatformText(source, 'linkedin', 'For LinkedIn\nsecond line');
		expect(edited).toContain('# a comment the app must keep');
		expect(edited).toContain('  linkedin:\n    text: |-\n      For LinkedIn\n      second line');
		expect(edited.endsWith('<!-- private note -->\n')).toBe(true);
		expect(parsePostFile(edited).platforms.linkedin?.text).toBe('For LinkedIn\nsecond line');

		const cleared = setPlatformText(edited, 'linkedin', null);
		expect(cleared).not.toContain('linkedin');
		expect(parsePostFile(cleared).platforms.instagram?.text).toBe(
			'Big news! (link below)\n#launch\n'
		);
	});

	it('leaves the file untouched when clearing an override that is not there', () => {
		const plain = '---\ntitle: T\n---\nBody\n';
		expect(setPlatformText(plain, 'linkedin', null)).toBe(plain);
		expect(setPlatformText('Body\n', 'instagram', null)).toBe('Body\n');
	});

	it('removes empty front matter entirely', () => {
		const withText = setPlatformText('Body\n', 'linkedin', 'x');
		expect(withText).toBe('---\nplatforms:\n  linkedin:\n    text: x\n---\nBody\n');
		expect(setPlatformText(withText, 'linkedin', null)).toBe('Body\n');
	});

	it('records a published post', () => {
		const published = setPublished(source, 'linkedin', {
			url: 'https://li/x',
			id: 'urn:li:share:1',
			publishedAt: '2026-10-11T10:00:00.000Z'
		});
		expect(parsePostFile(published).platforms.linkedin?.published?.id).toBe('urn:li:share:1');
	});
});

describe('new posts', () => {
	it('writes front matter, text and media references', () => {
		const created = newPostSource({
			title: 'Launch',
			date: '2026-10-11',
			text: 'Hello\n',
			mediaFiles: ['a b.jpg']
		});
		expect(created).toBe('---\ntitle: Launch\ndate: 2026-10-11\n---\nHello\n\n![](a%20b.jpg)\n');
		expect(parsePostFile(created).media).toEqual([{ alt: '', src: 'a b.jpg' }]);
	});

	it('slugifies titles and file names safely', () => {
		expect(slugify('Ærø: Café & Co!')).toBe('r-cafe-co');
		const taken = new Set<string>();
		expect(safeFileName('My Photo.JPG', taken)).toBe('my-photo.jpg');
		expect(safeFileName('my photo.jpg', taken)).toBe('my-photo-2.jpg');
		expect(safeFileName('../../etc/passwd', taken)).toBe('passwd');
	});
});
