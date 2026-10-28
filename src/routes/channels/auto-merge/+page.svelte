<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import AutoMergeReview from '#lib/components/AutoMergeReview.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Auto Merge channels · Social Sanity</title>
</svelte:head>

<PageHeader title="Auto Merge" back={{ href: resolve('/channels'), label: 'Channels' }}>
	{#snippet lede()}Find channels that are listed twice, and merge them one pair at a time.{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'found' in form}
	<Alert tone={form.found ? 'ok' : 'info'}>
		{form.found
			? `The AI found ${form.found} possible duplicates.`
			: 'The AI found no new duplicates.'}
	</Alert>
{/if}
{#if form && 'merged' in form && form.merged}
	<Alert tone="ok">Merged into {form.merged.kept}.</Alert>
{/if}

<AutoMergeReview
	kind={data.kind}
	current={data.current}
	left={data.left}
	claudeConfigured={data.claudeConfigured}
/>
