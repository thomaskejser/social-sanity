<script lang="ts">
	import '#lib/styles/app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SideNav, { type NavItem } from '#lib/components/SideNav.svelte';

	let { children } = $props();

	const navItems: NavItem[] = [
		{ href: resolve('/tasks'), label: 'Tasks', icon: 'tasks', match: '/tasks' },
		{ href: resolve('/consume'), label: 'Consume', icon: 'consume', match: '/consume' },
		{ href: resolve('/humans'), label: 'Humans', icon: 'humans', match: '/humans' },
		{ href: resolve('/companies'), label: 'Companies', icon: 'company', match: '/companies' },
		{ href: resolve('/channels'), label: 'Channels', icon: 'channel', match: '/channels' },
		{ href: resolve('/contribute'), label: 'Contribute', icon: 'contribute', match: '/contribute' },
		{
			href: resolve('/integrations'),
			label: 'Integrations',
			icon: 'integrations',
			match: '/integrations'
		},
		{ href: resolve('/settings'), label: 'Settings', icon: 'settings', match: '/settings' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Social Sanity</title>
</svelte:head>

<SideNav items={navItems} currentPath={page.url.pathname} />

<main>
	{@render children()}
</main>
