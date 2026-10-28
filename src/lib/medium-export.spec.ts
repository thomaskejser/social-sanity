import { describe, expect, it } from 'vitest';
import { describeArchive, feedTitleName, findFollows } from './medium-export.ts';

describe('findFollows', () => {
	it('finds writers and publications in following files', () => {
		const follows = findFollows([
			{
				path: 'medium-export/users following/following.html',
				html: '<ul><li><a href="https://medium.com/@ada">Ada &amp; Co</a></li><li><a href="https://grace.medium.com/">Grace</a></li></ul>'
			},
			{
				path: 'medium-export/pubs following/following.html',
				html: '<a class="h-cite" href="https://medium.com/towards-data-science">Towards Data Science</a>'
			}
		]);
		expect(follows).toEqual([
			{
				kind: 'writer',
				name: 'Ada & Co',
				url: 'https://medium.com/@ada',
				feedUrl: 'https://medium.com/feed/@ada'
			},
			expect.objectContaining({ kind: 'writer', name: 'Grace' }),
			expect.objectContaining({ kind: 'publication', name: 'Towards Data Science' })
		]);
	});

	it('ignores other files, other sites and repeats', () => {
		const follows = findFollows([
			{ path: 'medium-export/claps/claps.html', html: '<a href="https://medium.com/@ada">Ada</a>' },
			{
				path: 'medium-export/users following/a.html',
				html: '<a href="https://example.com/@x">X</a><a href="https://medium.com/@ada">Ada</a><a href="https://medium.com/@ada">Ada again</a>'
			}
		]);
		expect(follows.map((f) => f.name)).toEqual(['Ada']);
	});
});

describe('Medium export format', () => {
	it('reads @handles and publications on their own domain, as Medium writes them', () => {
		const follows = findFollows([
			{
				path: 'users-following/users-following-0001.html',
				html: '<li><a class="h-cite u-like-of" href="https://medium.com/@williamvaughn">@williamvaughn</a></li>'
			},
			{
				path: 'pubs-following/pubs-following-0001.html',
				html: '<li><a href="https://python.plainenglish.io">Python in Plain English</a></li>'
			}
		]);
		expect(follows).toEqual([
			{
				kind: 'writer',
				name: 'williamvaughn',
				url: 'https://medium.com/@williamvaughn',
				feedUrl: 'https://medium.com/feed/@williamvaughn'
			},
			{
				kind: 'publication',
				name: 'Python in Plain English',
				url: 'https://python.plainenglish.io',
				feedUrl: 'https://python.plainenglish.io/feed'
			}
		]);
	});

	it('does not treat other sites linked from the writers file as follows', () => {
		expect(
			findFollows([
				{ path: 'users-following/a.html', html: '<a href="https://example.com/x">x</a>' }
			])
		).toEqual([]);
	});
});

describe('feedTitleName', () => {
	it('takes the name out of a Medium feed title', () => {
		expect(feedTitleName('Stories by William Vaughn on Medium')).toBe('William Vaughn');
		expect(feedTitleName('Python in Plain English - Medium')).toBe('Python in Plain English');
	});
});

describe('describeArchive', () => {
	it('counts files per folder', () => {
		expect(describeArchive(['a/x.html', 'a/y.html', 'b/', 'b/z.html', 'readme.html'])).toEqual([
			{ folder: '(top level)', files: 1 },
			{ folder: 'a', files: 2 },
			{ folder: 'b', files: 1 }
		]);
	});
});
