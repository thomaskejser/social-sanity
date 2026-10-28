<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Card from '#lib/components/Card.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import ChannelForm from '#lib/components/ChannelForm.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
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
</script>

<svelte:head>
	<title>{data.channel.channel} · Social Sanity</title>
</svelte:head>

<PageHeader
	title={data.channel.channel}
	back={{ href: resolve('/channels'), label: 'All channels' }}
>
	{#snippet actions()}
		<DeleteButton
			name={data.channel.channel}
			consequence="Its content sources and group memberships are deleted too. Groups are kept, and YouTube imports won't add it again."
		/>
	{/snippet}
	{#snippet lede()}
		{#if data.channel.website}<ExternalLink href={data.channel.website}
				>{data.channel.website}</ExternalLink
			>{/if}
	{/snippet}
</PageHeader>

<KudosBar
	kudos={data.channel.kudos}
	action="?/kudos"
	label={data.channel.channel}
	fields={{ channelId: data.channel.channelId }}
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

<ChannelForm
	channel={data.channel}
	errors={form && 'channelErrors' in form ? (form.channelErrors ?? null) : null}
	action="?/save"
	submitLabel="Save"
/>

<CardGrid>
	<SocialAccounts
		accounts={data.socialAccounts}
		error={form && 'socialError' in form ? form.socialError : undefined}
	/>
	<Card title="Content sources">
		<p class="card-note">What this channel publishes. Its articles and videos appear in Consume.</p>
		<SourceList
			sources={data.sources}
			fields={{}}
			error={form && 'sourceError' in form ? form.sourceError : undefined}
		/>
	</Card>
	<EnrichPanel
		name={data.channel.channel}
		kind="channel"
		result={form && 'enrich' in form ? (form.enrich ?? null) : null}
		configured={data.claudeConfigured}
		enrichedAt={data.enrichedAt}
	/>
	<GroupMembership groups={data.groups} />
</CardGrid>
