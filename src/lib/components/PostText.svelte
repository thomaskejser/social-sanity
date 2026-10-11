<script lang="ts">
	import { foldText, tokenize } from '#lib/format/text.ts';
	import Button from './Button.svelte';
	import ExternalLink from './ExternalLink.svelte';

	let {
		text,
		foldAt,
		foldLines,
		linksClickable
	}: { text: string; foldAt: number; foldLines: number; linksClickable: boolean } = $props();

	let expanded = $state(false);
	const folded = $derived(foldText(text, foldAt, foldLines));
	const shown = $derived(expanded || folded === null ? text : folded);
	const tokens = $derived(tokenize(shown));
</script>

<p class="post-text">
	{#each tokens as token, i (i)}
		{#if token.kind === 'text'}{token.value}{:else if token.kind === 'link' && linksClickable}<ExternalLink
				href={token.value}>{token.value}</ExternalLink
			>{:else}<span data-token={token.kind}>{token.value}</span>{/if}
	{/each}
	{#if folded !== null}
		{#if !expanded}…{/if}
		<Button action="inline" onclick={() => (expanded = !expanded)}>
			{expanded ? 'less' : 'more'}
		</Button>
	{/if}
</p>
