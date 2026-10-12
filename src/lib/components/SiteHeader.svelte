<script lang="ts" module>
	import type { ResolvedPathname } from '$app/types';

	export type NavItem = {
		href: ResolvedPathname;
		label: string;
		/** Plain pathname prefix used to mark the item current (`resolve()` may return relative hrefs). */
		match: string;
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import NavLink from './NavLink.svelte';

	let { items, currentPath }: { items: NavItem[]; currentPath: string } = $props();

	function isCurrent(match: string) {
		return match === '/' ? currentPath === '/' : currentPath.startsWith(match);
	}
</script>

<header>
	<p><a href={resolve('/')}>Social Sanity</a></p>
	<nav aria-label="Main">
		<ul>
			{#each items as item (item.href)}
				<li><NavLink href={item.href} current={isCurrent(item.match)}>{item.label}</NavLink></li>
			{/each}
		</ul>
	</nav>
</header>
