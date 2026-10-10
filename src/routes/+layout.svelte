<script lang="ts">
	import '#lib/styles/app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SiteHeader, { type NavItem } from '#lib/components/SiteHeader.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const navItems: NavItem[] = [
		{ href: resolve('/'), label: 'Home', match: '/' },
		{ href: resolve('/integrations'), label: 'Integrations', match: '/integrations' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Social Sanity</title>
</svelte:head>

<SiteHeader items={navItems} currentPath={page.url.pathname} showLogout={data.authenticated} />

<main class="site-main">
	{@render children()}
</main>
