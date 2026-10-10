<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	let {
		href,
		variant = 'primary',
		reload = false,
		children
	}: {
		href: ResolvedPathname;
		variant?: 'primary' | 'secondary';
		/** Bypass client-side routing, e.g. for server endpoints that redirect off-site. */
		reload?: boolean;
		children: Snippet;
	} = $props();
</script>

<a
	class="button button--{variant}"
	{href}
	data-sveltekit-reload={reload ? '' : undefined}
	data-sveltekit-preload-data={reload ? 'off' : undefined}>{@render children()}</a
>
