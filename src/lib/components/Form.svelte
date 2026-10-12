<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';

	let {
		action,
		method = 'POST',
		label,
		variant,
		resetOnSuccess = true,
		enctype,
		children
	}: {
		action?: string;
		method?: 'GET' | 'POST';
		/** Accessible name for the form. */
		label?: string;
		/** Semantic modifier, e.g. "compose" renders `.compose-form`. */
		variant?: string;
		/** Set false for edit forms whose fields should keep their values after saving. */
		resetOnSuccess?: boolean;
		enctype?: 'multipart/form-data';
		children: Snippet;
	} = $props();
</script>

<form
	{action}
	{method}
	{enctype}
	aria-label={label}
	class={variant ? `${variant}-form` : undefined}
	use:enhance={() =>
		async ({ update }) => {
			await update({ reset: resetOnSuccess });
		}}
>
	{@render children()}
</form>
