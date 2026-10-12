<script lang="ts">
	import '#lib/styles/app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader, { type NavItem } from '#lib/components/SiteHeader.svelte';

	let { children } = $props();

	const navItems: NavItem[] = [
		{ href: resolve('/'), label: 'Home', match: '/' },
		{ href: resolve('/posts'), label: 'Posts', match: '/posts' },
		{ href: resolve('/integrations'), label: 'Integrations', match: '/integrations' },
		{ href: resolve('/settings'), label: 'Settings', match: '/settings' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Social Sanity</title>
</svelte:head>

<SiteHeader items={navItems} currentPath={page.url.pathname} />

<main>
	{@render children()}
</main>

<SiteFooter />
