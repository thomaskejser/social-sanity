<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';

	let {
		action,
		method = 'POST',
		label,
		variant,
		children
	}: {
		action?: string;
		method?: 'GET' | 'POST';
		/** Accessible name for the form. */
		label?: string;
		/** Semantic modifier, e.g. "login" renders `.login-form`. */
		variant?: string;
		children: Snippet;
	} = $props();
</script>

<form
	{action}
	{method}
	aria-label={label}
	class={variant ? `${variant}-form` : undefined}
	use:enhance
>
	{@render children()}
</form>
