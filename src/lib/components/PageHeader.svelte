<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, lede }: { title: string; lede?: Snippet } = $props();
</script>

<header>
	<h1>{title}</h1>
	{#if lede}
		<p>{@render lede()}</p>
	{/if}
</header>
