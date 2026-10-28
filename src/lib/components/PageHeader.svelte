<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import Link from './Link.svelte';

	let {
		title,
		lede,
		back,
		leading,
		actions
	}: {
		title: string;
		lede?: Snippet;
		/** The page this one belongs under, linked below the title. */
		back?: { href: ResolvedPathname; label: string };
		/** Controls shown before the title, such as a delete button. */
		leading?: Snippet;
		/** Controls shown at the right end of the title row. */
		actions?: Snippet;
	} = $props();
</script>

<header>
	{#if leading || actions}
		<div class="page-title">
			{@render leading?.()}
			<h1>{title}</h1>
			{#if actions}<div class="page-actions">{@render actions()}</div>{/if}
		</div>
	{:else}
		<h1>{title}</h1>
	{/if}
	{#if lede}
		<p>{@render lede()}</p>
	{/if}
	{#if back}
		<p><Link href={back.href}>← {back.label}</Link></p>
	{/if}
</header>
