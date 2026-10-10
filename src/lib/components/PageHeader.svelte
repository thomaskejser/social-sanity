<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, lede }: { title: string; lede?: Snippet } = $props();
</script>

<header class="page-header">
	<h1>{title}</h1>
	{#if lede}
		<p class="page-header__lede">{@render lede()}</p>
	{/if}
</header>
