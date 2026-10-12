<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href,
		action,
		children
	}: { href: string; action?: 'primary' | 'secondary'; children: Snippet } = $props();
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
<a {href} data-action={action} target="_blank" rel="noopener noreferrer">{@render children()}</a>
