<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		name,
		value,
		formaction,
		onclick,
		children
	}: {
		variant?: 'primary' | 'secondary' | 'danger' | 'link';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		name?: string;
		value?: string;
		formaction?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();
</script>

<button class="button button--{variant}" {type} {disabled} {name} {value} {formaction} {onclick}>
	{@render children()}
</button>
