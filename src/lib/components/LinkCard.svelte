<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	let { title, href, children }: { title: string; href: ResolvedPathname; children: Snippet } =
		$props();
</script>

<article class="card link-card">
	<header><h2><a {href}>{title}</a></h2></header>
	{@render children()}
</article>
