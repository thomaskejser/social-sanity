<script lang="ts">
	import { resolve } from '$app/paths';
	import AutoEnrichLog from '#lib/components/AutoEnrichLog.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { autoRefresh } from '#lib/refresh.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	autoRefresh(() => data.run.running);
</script>

<svelte:head>
	<title>Auto enrich companies · Social Sanity</title>
</svelte:head>

<PageHeader title="Auto enrich" back={{ href: resolve('/companies/enrich'), label: 'Enrich' }}>
	{#snippet lede()}
		The AI looks up every company left to enrich, one after another, and saves only what it is
		highly confident about. Nothing is deleted or merged. Stop goes back to looking them up one at a
		time.
	{/snippet}
</PageHeader>

<AutoEnrichLog
	kind="company"
	noun="companies"
	running={data.run.running}
	current={data.run.current}
	entries={data.run.entries}
	looked={data.run.looked}
	saved={data.run.saved}
	error={data.run.error}
	paused={data.run.paused}
	remaining={data.remaining}
	walkHref={resolve('/companies/enrich')}
/>
