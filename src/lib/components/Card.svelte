<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children,
		actions
	}: {
		title: string;
		children: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<section class="card">
	<h2 class="card__title">{title}</h2>
	{@render children()}
	{#if actions}
		<div class="card__actions">{@render actions()}</div>
	{/if}
</section>
