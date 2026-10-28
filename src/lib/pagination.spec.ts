import { describe, expect, it } from 'vitest';
import { pageLinks, paginate, requestedPage } from './pagination.ts';

describe('paginate', () => {
	it('computes the offset and page count', () => {
		expect(paginate(1397, 3, 50)).toEqual({
			page: 3,
			pageCount: 28,
			pageSize: 50,
			offset: 100,
			total: 1397
		});
	});

	it('clamps pages past the end and has one page when empty', () => {
		expect(paginate(120, 9, 50).page).toBe(3);
		expect(paginate(0, 1, 50)).toMatchObject({ page: 1, pageCount: 1, offset: 0 });
	});
});

describe('requestedPage', () => {
	it('reads a positive whole number and falls back to 1', () => {
		expect(requestedPage(new URL('http://x/humans?page=4'))).toBe(4);
		expect(requestedPage(new URL('http://x/humans'))).toBe(1);
		expect(requestedPage(new URL('http://x/humans?page=-2'))).toBe(1);
		expect(requestedPage(new URL('http://x/humans?page=2.5'))).toBe(1);
		expect(requestedPage(new URL('http://x/humans?page=abc'))).toBe(1);
	});
});

describe('pageLinks', () => {
	it('shows every page when there are few', () => {
		expect(pageLinks(2, 4)).toEqual([1, 2, 3, 4]);
	});

	it('marks gaps around the current page', () => {
		expect(pageLinks(10, 28)).toEqual([1, null, 8, 9, 10, 11, 12, null, 28]);
		expect(pageLinks(1, 28)).toEqual([1, 2, 3, null, 28]);
	});
});
