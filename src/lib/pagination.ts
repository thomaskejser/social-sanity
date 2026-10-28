export type Page = {
	/** 1-based page number, clamped to the pages that exist. */
	page: number;
	pageCount: number;
	pageSize: number;
	offset: number;
	total: number;
};

/** Reads `?page=` (or another parameter) from a URL; anything but a positive whole number is 1. */
export function requestedPage(url: URL, param = 'page'): number {
	const page = Number(url.searchParams.get(param));
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export function paginate(total: number, requested: number, pageSize: number): Page {
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(1, requested), pageCount);
	return { page, pageCount, pageSize, offset: (page - 1) * pageSize, total };
}

/**
 * The page numbers to link to: the first and last page, and up to `around` pages each side of the
 * current one. `null` marks a gap.
 */
export function pageLinks(page: number, pageCount: number, around = 2): (number | null)[] {
	const links: (number | null)[] = [];
	for (let n = 1; n <= pageCount; n++) {
		const near = Math.abs(n - page) <= around;
		if (n === 1 || n === pageCount || near) links.push(n);
		else if (links.at(-1) !== null) links.push(null);
	}
	return links;
}
