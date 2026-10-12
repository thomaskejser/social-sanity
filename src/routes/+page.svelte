<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '#lib/components/Card.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import IntegrationSummary from '#lib/components/IntegrationSummary.svelte';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title="Social Sanity">
	{#snippet lede()}Publish everywhere. See only what you want.{/snippet}
</PageHeader>

<CardGrid>
	<LinkCard title="Integrations" href={resolve('/integrations')}>
		<p>Connect your LinkedIn and Instagram accounts.</p>
		<IntegrationSummary integrations={data.integrations} />
	</LinkCard>
	<Card title="Publish">
		<p>Write once and post to LinkedIn and Instagram, formatted for each platform.</p>
	</Card>
	<Card title="Filter">
		<p>
			The Firefox extension hides LinkedIn and Instagram posts that don't match your rules and
			interests.
		</p>
	</Card>
</CardGrid>
