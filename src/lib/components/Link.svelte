<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	let { href, children }: { href: ResolvedPathname; children: Snippet } = $props();
</script>

<a {href}>{@render children()}</a>
