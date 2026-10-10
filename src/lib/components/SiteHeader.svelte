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
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import NavLink from './NavLink.svelte';

	let {
		items,
		currentPath,
		showLogout
	}: {
		items: NavItem[];
		currentPath: string;
		showLogout: boolean;
	} = $props();

	function isCurrent(match: string) {
		return match === '/' ? currentPath === '/' : currentPath.startsWith(match);
	}
</script>

<header class="site-header">
	<nav class="site-nav" aria-label="Main">
		<a class="site-nav__brand" href={resolve('/')}>Social Sanity</a>
		{#if showLogout}
			<ul class="site-nav__links">
				{#each items as item (item.href)}
					<li><NavLink href={item.href} current={isCurrent(item.match)}>{item.label}</NavLink></li>
				{/each}
			</ul>
			<Form action="/logout" label="Log out">
				<Button type="submit" variant="secondary">Log out</Button>
			</Form>
		{/if}
	</nav>
</header>
