<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	let {
		href,
		current = false,
		children
	}: {
		href: ResolvedPathname;
		current?: boolean;
		children: Snippet;
	} = $props();
</script>

<a {href} aria-current={current ? 'page' : undefined}>{@render children()}</a>
