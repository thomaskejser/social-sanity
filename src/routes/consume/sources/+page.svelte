<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import ExternalLink from '#lib/components/ExternalLink.svelte';
	import Form from '#lib/components/Form.svelte';
	import Link from '#lib/components/Link.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PublisherCard, { KIND_LABELS } from '#lib/components/PublisherCard.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const sourceError = (publisherId: number) =>
		form && 'sourceError' in form && form.sourceError?.publisherId === publisherId
			? form.sourceError.message
			: undefined;
</script>

<svelte:head>
	<title>Sources · Social Sanity</title>
</svelte:head>

<PageHeader title="Sources" back={{ href: resolve('/consume'), label: 'Feed' }}>
	{#snippet lede()}
		Companies and agents you follow, with their kudos. Sources of humans, companies and channels are
		kept on each one's own page.
	{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}

<Form action="?/createPublisher" label="Add a company or agent" variant="settings">
	<TextField
		label="Name"
		name="publisher"
		error={form && 'publisherError' in form ? form.publisherError : undefined}
		required
	/>
	<SelectField
		label="Kind"
		name="publisherKind"
		value="COMPANY"
		options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
	/>
	<footer><Button type="submit">Add</Button></footer>
</Form>

<CardGrid>
	{#each data.publishers as publisher (publisher.publisherId)}
		<PublisherCard {publisher} error={sourceError(publisher.publisherId)} />
	{/each}
</CardGrid>

<DataTable
	caption="Humans' sources"
	columns={['Human', 'Source', 'Status']}
	rows={data.humanSources}
>
	{#snippet row(source)}
		<td>
			<Link href={resolve('/humans/[id]', { id: String(source.humanId) })}>{source.owner}</Link>
		</td>
		<td><ExternalLink href={source.contentSource}>{source.contentSource}</ExternalLink></td>
		<td>{source.lastFetchMessage ?? 'Not read yet'}</td>
	{/snippet}
	{#snippet empty()}No human has a content source yet.{/snippet}
</DataTable>
