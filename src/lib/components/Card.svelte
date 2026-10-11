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
	<header><h2>{title}</h2></header>
	{@render children()}
	{#if actions}
		<footer>{@render actions()}</footer>
	{/if}
</section>
