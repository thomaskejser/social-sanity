<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Card from '#lib/components/Card.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import CompanyForm from '#lib/components/CompanyForm.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import DetailList from '#lib/components/DetailList.svelte';
	import EnrichPanel from '#lib/components/EnrichPanel.svelte';
	import ExternalReferences from '#lib/components/ExternalReferences.svelte';
	import ExternalLink from '#lib/components/ExternalLink.svelte';
	import GroupMembership from '#lib/components/GroupMembership.svelte';
	import KudosBar from '#lib/components/KudosBar.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SocialAccounts from '#lib/components/SocialAccounts.svelte';
	import SourceList from '#lib/components/SourceList.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const detailError = (kind: string) =>
		form && 'detailError' in form && form.detailError?.kind === kind
			? form.detailError.message
			: undefined;
</script>

<svelte:head>
	<title>{data.company.company} · Social Sanity</title>
</svelte:head>

<PageHeader
	title={data.company.company}
	back={{ href: resolve('/companies'), label: 'All companies' }}
>
	{#snippet actions()}
		<DeleteButton
			name={data.company.company}
			consequence="Its details, content sources and group memberships are deleted too. Groups are kept."
		/>
	{/snippet}
	{#snippet lede()}
		{#if data.company.website}<ExternalLink href={data.company.website}
				>{data.company.website}</ExternalLink
			>{/if}
	{/snippet}
</PageHeader>

<KudosBar
	kudos={data.company.kudos}
	action="?/kudos"
	label={data.company.company}
	fields={{ companyId: data.company.companyId }}
/>

<ExternalReferences references={data.references} />

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'enrichmentApplied' in form}
	<Alert tone="ok">Added what you selected.</Alert>
{/if}
{#if form && 'saved' in form}
	<Alert tone="ok">Saved.</Alert>
{/if}

<CompanyForm
	company={data.company}
	errors={form && 'companyErrors' in form ? (form.companyErrors ?? null) : null}
	action="?/save"
	submitLabel="Save"
/>

<CardGrid>
	<DetailList
		kind="phone"
		title="Phone numbers"
		items={data.details.phone}
		valueLabel="Number"
		hint="With country code, e.g. +45 12 34 56 78."
		error={detailError('phone')}
	/>
	<DetailList
		kind="address"
		title="Addresses"
		items={data.details.address}
		valueLabel="Address"
		error={detailError('address')}
	/>
	<SocialAccounts
		accounts={data.socialAccounts}
		error={form && 'socialError' in form ? form.socialError : undefined}
	/>
	<Card title="Content sources">
		<p class="card-note">What this company publishes. Its articles appear in Consume.</p>
		<SourceList
			sources={data.sources}
			fields={{}}
			error={form && 'sourceError' in form ? form.sourceError : undefined}
		/>
	</Card>
	<EnrichPanel
		name={data.company.company}
		kind="company"
		result={form && 'enrich' in form ? (form.enrich ?? null) : null}
		configured={data.claudeConfigured}
		enrichedAt={data.enrichedAt}
	/>
	<GroupMembership groups={data.groups} />
</CardGrid>
