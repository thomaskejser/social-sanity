<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import BirthdayItem from '#lib/components/BirthdayItem.svelte';
	import Button from '#lib/components/Button.svelte';
	import FeedItem from '#lib/components/FeedItem.svelte';
	import Form from '#lib/components/Form.svelte';
	import LinkButton from '#lib/components/LinkButton.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Consume · Social Sanity</title>
</svelte:head>

<PageHeader title="Consume">
	{#snippet lede()}
		Coming birthdays, then the last {data.feedDays} days from the humans, companies, agents and channels
		you follow, those with the most kudos first.
	{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'taskAdded' in form}
	<Alert tone="ok">Added to your tasks under “{form.taskAdded}”.</Alert>
{/if}
{#if form && 'refreshed' in form && form.refreshed}
	<Alert tone={form.refreshed.failed ? 'warn' : 'ok'}>
		{form.refreshed.fetched} sources read{form.refreshed.failed
			? `, ${form.refreshed.failed} could not be read (see Sources)`
			: ''}.
	</Alert>
{/if}

<Form action="?/refresh" label="Refresh the feed">
	<footer>
		<Button type="submit" action="secondary">Refresh now</Button>
		<LinkButton href={resolve('/consume/sources')} action="secondary">Sources</LinkButton>
	</footer>
</Form>

{#if !data.sourceCount}
	<Alert tone="info">
		No content sources yet. Add them on the page of a human, company or channel, or to agents under
		Sources.
	</Alert>
{/if}

<div class="feed">
	{#each data.birthdays as birthday (birthday.humanId)}
		<BirthdayItem {birthday} />
	{/each}
	{#each data.feed as item (item.articleId)}
		<FeedItem {item} />
	{:else}
		{#if data.sourceCount}
			<p>Nothing new. The feed is read every 30 minutes, or press “Refresh now”.</p>
		{/if}
	{/each}
</div>
