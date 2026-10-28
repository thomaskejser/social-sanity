<script lang="ts">
	import { resolve } from '$app/paths';
	import JobTable from '#lib/components/JobTable.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Background jobs · Social Sanity</title>
</svelte:head>

<PageHeader title="Background jobs" back={{ href: resolve('/settings'), label: 'Settings' }}>
	{#snippet lede()}
		What the app does on its own, what each job did last time, and when it runs next.
	{/snippet}
</PageHeader>

<JobTable jobs={data.jobs} />
