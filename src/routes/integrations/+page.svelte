<script lang="ts">
	import IntegrationList from '#lib/components/IntegrationList.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Integrations · Social Sanity</title>
</svelte:head>

<PageHeader title="Integrations">
	{#snippet lede()}The services Social Sanity reads from and publishes to.{/snippet}
</PageHeader>

<IntegrationList integrations={data.integrations} />
