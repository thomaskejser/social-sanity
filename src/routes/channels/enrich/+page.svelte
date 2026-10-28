<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import EnrichRunner from '#lib/components/EnrichRunner.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Enrich channels · Social Sanity</title>
</svelte:head>

<PageHeader title="Enrich" back={{ href: resolve('/channels'), label: 'All channels' }}>
	{#snippet lede()}
		One at a time, the AI looks up channels that lack social media or content sources. Each one it
		has looked up is marked and skipped from then on; use Enrich on its own page to look it up
		again. It sends what the app knows about each one to the AI; nothing is saved until you choose
		it. Auto looks up every one of them in turn and saves only what the AI is highly confident
		about.
	{/snippet}
</PageHeader>

{#if !data.claudeConfigured}
	<Alert tone="info">Set up AI under Integrations to use Enrich.</Alert>
{:else if !data.candidate && !form?.lookup}
	<Alert tone="ok"
		>Every channel has social media and content sources, or the AI has looked it up.</Alert
	>
{:else}
	<EnrichRunner
		kind={data.kind}
		converted={data.converted}
		noun="channels"
		candidate={data.candidate}
		auto={data.auto}
		result={form?.lookup ?? null}
		pagePath={resolve('/channels/enrich')}
		stopHref={resolve('/channels')}
	/>
{/if}
