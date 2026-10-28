<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		name,
		checked = false,
		value,
		description,
		picture,
		badge
	}: {
		label: string;
		name: string;
		checked?: boolean;
		value?: string;
		description?: string;
		/** Address of a picture shown with the label, for choosing between pictures. */
		picture?: string;
		badge?: Snippet;
	} = $props();

	const id = $props.id();
</script>

<div class="choice">
	<input
		{id}
		type="checkbox"
		{name}
		{value}
		{checked}
		aria-describedby={description ? `${id}-desc` : undefined}
	/>
	<label for={id}
		>{#if picture}<img
				class="choice-picture"
				src={picture}
				alt=""
				width="80"
				height="80"
				loading="lazy"
				referrerpolicy="no-referrer"
			/>{/if}{label}
		{#if badge}{@render badge()}{/if}</label
	>
	{#if description}
		<p class="choice-description" id="{id}-desc">{description}</p>
	{/if}
</div>
