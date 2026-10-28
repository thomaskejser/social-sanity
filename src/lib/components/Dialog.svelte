<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		title,
		onclose,
		children
	}: { open: boolean; title: string; onclose: () => void; children: Snippet } = $props();

	let dialog: HTMLDialogElement;
	const id = $props.id();

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog bind:this={dialog} aria-labelledby={id} {onclose}>
	<h2 {id}>{title}</h2>
	{#if open}
		{@render children()}
	{/if}
</dialog>
