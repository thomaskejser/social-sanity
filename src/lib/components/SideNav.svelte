<script lang="ts" module>
	import type { ResolvedPathname } from '$app/types';
	import type { IconName } from './Icon.svelte';

	export type NavItem = {
		href: ResolvedPathname;
		label: string;
		icon: IconName;
		/** Plain pathname prefix used to mark the item current (`resolve()` may return relative hrefs). */
		match: string;
	};
</script>

<script lang="ts">
	import Icon from './Icon.svelte';

	let { items, currentPath }: { items: NavItem[]; currentPath: string } = $props();
</script>

<nav class="side-nav" aria-label="Main">
	<p>Social Sanity</p>
	<ul>
		{#each items as item (item.href)}
			<li>
				<a href={item.href} aria-current={currentPath.startsWith(item.match) ? 'page' : undefined}>
					<Icon name={item.icon} />
					<span>{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
