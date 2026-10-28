<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Card from '#lib/components/Card.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import DetailList from '#lib/components/DetailList.svelte';
	import EnrichPanel from '#lib/components/EnrichPanel.svelte';
	import ExternalReferences from '#lib/components/ExternalReferences.svelte';
	import HumanForm from '#lib/components/HumanForm.svelte';
	import HumanPictures from '#lib/components/HumanPictures.svelte';
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
	<title>{data.human.human} · Social Sanity</title>
</svelte:head>

<PageHeader title={data.human.human} back={{ href: resolve('/humans'), label: 'All humans' }}>
	{#snippet leading()}
		<DeleteButton
			name={data.human.human}
			consequence="Their details, content sources and group memberships are deleted too. Groups and other humans are kept."
		/>
	{/snippet}
</PageHeader>

<KudosBar
	kudos={data.human.kudos}
	action="?/kudos"
	label={data.human.human}
	fields={{ humanId: data.human.humanId }}
/>

<ExternalReferences references={data.references} />

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'saved' in form}
	<Alert tone="ok">Saved.</Alert>
{/if}
{#if form && 'enrichmentApplied' in form}
	<Alert tone="ok">Added what you selected.</Alert>
{/if}

<HumanForm
	human={data.human}
	errors={form && 'humanErrors' in form ? (form.humanErrors ?? null) : null}
	fromGoogle={data.references.some((r) => r.source === 'GOOGLE_CONTACTS')}
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
	<DetailList
		kind="specialDay"
		title="Special days"
		items={data.details.specialDay}
		valueLabel="Day"
		hint="Tick “Year unknown” for days that repeat every year."
		error={detailError('specialDay')}
	/>
	<DetailList
		kind="nickname"
		title="Nicknames"
		items={data.details.nickname}
		valueLabel="Nickname"
		error={detailError('nickname')}
	/>
	<HumanPictures humanId={data.human.humanId} pictures={data.pictures} />
	<SocialAccounts
		accounts={data.socialAccounts}
		error={form && 'socialError' in form ? form.socialError : undefined}
	/>
	<Card title="Content sources">
		<p class="card-note">
			What this human makes available online. Their articles appear in Consume.
		</p>
		<SourceList
			sources={data.sources}
			fields={{}}
			error={form && 'sourceError' in form ? form.sourceError : undefined}
		/>
	</Card>
	<EnrichPanel
		name={data.human.human}
		kind="human"
		result={form && 'enrich' in form ? (form.enrich ?? null) : null}
		configured={data.claudeConfigured}
		enrichedAt={data.enrichedAt}
	/>
	<GroupMembership groups={data.groups} />
</CardGrid>
