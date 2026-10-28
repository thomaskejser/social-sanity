<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { setFormPending } from './form-pending.ts';

	let {
		action,
		method = 'POST',
		label,
		variant,
		resetOnSuccess = true,
		enctype,
		onsubmit,
		onsuccess,
		onfailure,
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
		/** Called when the form is submitted. */
		onsubmit?: () => void;
		/** Called after the action succeeds and the page data has been updated. */
		onsuccess?: () => void;
		/** Called after the action fails or errors. */
		onfailure?: () => void;
		children: Snippet;
	} = $props();

	const pending = $state({ submitter: null as HTMLElement | null });
	setFormPending(pending);
</script>

{#if method === 'GET'}
	<!-- A GET form navigates to its query string; SvelteKit routes it client-side. -->
	<form {action} method="GET" aria-label={label} class={variant ? `${variant}-form` : undefined}>
		{@render children()}
	</form>
{:else}
	<form
		{action}
		method="POST"
		{enctype}
		aria-label={label}
		class={variant ? `${variant}-form` : undefined}
		use:enhance={({ submitter }) => {
			pending.submitter = submitter;
			onsubmit?.();
			return async ({ result, update }) => {
				// Actions belong to this page; stay on its URL (and query) instead of the action's.
				try {
					await update({ reset: resetOnSuccess, navigate: false });
				} finally {
					pending.submitter = null;
				}
				if (result.type === 'success') onsuccess?.();
				else onfailure?.();
			};
		}}
	>
		{@render children()}
	</form>
{/if}
