<script lang="ts">
	import { pageLinks } from '#lib/pagination.ts';

	let {
		page,
		pageCount,
		href
	}: {
		page: number;
		pageCount: number;
		/** Link to page `n`, keeping the page's other query parameters. */
		href: (n: number) => string;
	} = $props();

	const links = $derived(pageLinks(page, pageCount));
</script>

{#if pageCount > 1}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- query strings on the current, resolved page -->
	<nav class="pagination" aria-label="Pages">
		<ul>
			<li>
				{#if page > 1}<a href={href(page - 1)} rel="prev">Previous</a>{:else}<span>Previous</span
					>{/if}
			</li>
			{#each links as n, i (n ?? `gap-${i}`)}
				<li>
					{#if n === null}
						<span>…</span>
					{:else}
						<a href={href(n)} aria-current={n === page ? 'page' : undefined}>{n}</a>
					{/if}
				</li>
			{/each}
			<li>
				{#if page < pageCount}<a href={href(page + 1)} rel="next">Next</a>{:else}<span>Next</span
					>{/if}
			</li>
		</ul>
	</nav>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/if}
