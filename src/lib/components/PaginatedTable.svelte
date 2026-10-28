<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import type { Page } from '#lib/pagination.ts';
	import DataTable from './DataTable.svelte';
	import Pagination from './Pagination.svelte';

	let {
		caption,
		columns,
		rows,
		pages,
		href,
		row,
		empty
	}: {
		caption: string;
		columns: string[];
		/** The rows of the current page only. */
		rows: Row[];
		pages: Page;
		/** Link to page `n`, keeping the page's other query parameters. */
		href: (n: number) => string;
		row: Snippet<[Row]>;
		empty?: Snippet;
	} = $props();

	const first = $derived(pages.total ? pages.offset + 1 : 0);
	const last = $derived(pages.offset + rows.length);
</script>

<div class="paginated-table">
	<DataTable {caption} {columns} {rows} {row} {empty} />
	<footer>
		<p>{first}–{last} of {pages.total.toLocaleString()}</p>
		<Pagination page={pages.page} pageCount={pages.pageCount} {href} />
	</footer>
</div>
