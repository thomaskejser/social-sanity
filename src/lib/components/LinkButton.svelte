<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	let {
		href,
		action = 'primary',
		reload = false,
		children
	}: {
		href: ResolvedPathname;
		action?: 'primary' | 'secondary';
		/** Bypass client-side routing, e.g. for server endpoints that redirect off-site. */
		reload?: boolean;
		children: Snippet;
	} = $props();
</script>

<a
	data-action={action}
	{href}
	data-sveltekit-reload={reload ? '' : undefined}
	data-sveltekit-preload-data={reload ? 'off' : undefined}>{@render children()}</a
>
