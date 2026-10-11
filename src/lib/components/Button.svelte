<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		action = 'primary',
		type = 'button',
		disabled = false,
		name,
		value,
		formaction,
		onclick,
		children
	}: {
		action?: 'primary' | 'secondary' | 'destructive' | 'inline';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		name?: string;
		value?: string;
		formaction?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();
</script>

<button data-action={action} {type} {disabled} {name} {value} {formaction} {onclick}>
	{@render children()}
</button>
