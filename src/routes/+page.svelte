<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
</script>

<PageHeader title="Social Sanity">
	{#snippet lede()}Publish everywhere. See only what you want.{/snippet}
</PageHeader>

<CardGrid>
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
