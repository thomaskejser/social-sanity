<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getFormPending } from './form-pending.ts';

	let {
		action = 'primary',
		type = 'button',
		disabled = false,
		name,
		value,
		formaction,
		label,
		busy = false,
		busyLabel,
		onclick,
		children
	}: {
		action?: 'primary' | 'secondary' | 'destructive' | 'inline' | 'icon';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		name?: string;
		value?: string;
		formaction?: string;
		/** Accessible name; required when the button shows only an icon. */
		label?: string;
		/** Shows the button as working. A submit button in a Form is busy on its own while its action runs. */
		busy?: boolean;
		/** Text shown while busy, e.g. "Saving…". */
		busyLabel?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const pending = getFormPending();
	let element = $state<HTMLButtonElement>();

	/** Every submit button of a Form waits while one of them runs its action. */
	const formBusy = $derived(type === 'submit' && !!pending?.submitter);
	const isBusy = $derived(busy || (formBusy && pending?.submitter === element));
</script>

<button
	bind:this={element}
	data-action={action}
	{type}
	disabled={disabled || isBusy || formBusy}
	aria-busy={isBusy || undefined}
	{name}
	{value}
	{formaction}
	aria-label={label}
	title={label}
	{onclick}
>
	{#if isBusy && busyLabel}{busyLabel}{:else}{@render children()}{/if}
</button>
