<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';

	let {
		caption,
		columns,
		rows,
		row,
		empty
	}: {
		caption: string;
		columns: string[];
		rows: Row[];
		/** Renders the `<td>` cells for one row. */
		row: Snippet<[Row]>;
		empty?: Snippet;
	} = $props();
</script>

<div class="data-table">
	<table>
		<caption>{caption}</caption>
		<thead>
			<tr>
				{#each columns as column (column)}
					<th scope="col">{column}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as item, i (i)}
				<tr>{@render row(item)}</tr>
			{:else}
				<tr>
					<td colspan={columns.length}>
						{#if empty}{@render empty()}{:else}Nothing here yet.{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
