<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import AutocompleteField from '#lib/components/AutocompleteField.svelte';
	import ConvertedNotice from '#lib/components/ConvertedNotice.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import GroupList from '#lib/components/GroupList.svelte';
	import LinkButton from '#lib/components/LinkButton.svelte';
	import MemberTable from '#lib/components/MemberTable.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const groupNames = $derived(new Map(data.groups.map((g) => [g.humanGroupId, g.humanGroup])));

	function ungroupedHref(n: number): string {
		const params = new URLSearchParams({
			...(data.search ? { q: data.search } : {}),
			ungrouped: String(n)
		});
		return `${resolve('/channels')}?${params}`;
	}

	function pageHref(n: number): string {
		return `${resolve('/channels')}?${new URLSearchParams({ q: data.search, page: String(n) })}`;
	}
</script>

<svelte:head>
	<title>Channels · Social Sanity</title>
</svelte:head>

<PageHeader title="Channels">
	{#snippet lede()}The channels you follow: sources not tied to one person or company, in the same
		groups as your humans.{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'converted' in form && form.converted}
	<ConvertedNotice converted={form.converted} />
{/if}

<GroupList
	groups={data.groups}
	ungrouped={data.ungrouped}
	{ungroupedHref}
	page="channel"
	error={form && 'groupError' in form ? form.groupError : undefined}
/>

<section class="human-search" aria-labelledby="find">
	<h2 id="find">Find a channel</h2>
	<Form method="GET" label="Find channels" variant="inline">
		<AutocompleteField
			label="Name"
			name="q"
			source={resolve('/channels/suggest')}
			value={data.search}
			placeholder="Part of a name"
		/>
		<footer><Button type="submit">Search</Button></footer>
	</Form>
	{#if data.results}
		<MemberTable
			kind="channel"
			rows={data.results.channels.map((c) => ({ ...c, id: c.channelId, name: c.channel }))}
			pages={data.results.pages}
			href={pageHref}
			{groupNames}
		/>
	{:else}
		<p class="card-note">
			{data.total.toLocaleString()} channels. Search to find one; drag a result onto a group above to
			add it.
		</p>
	{/if}
</section>

<p>
	<LinkButton href={resolve('/channels/new')}>Add channel</LinkButton>
	<LinkButton href={resolve('/channels/enrich')} action="secondary">Enrich</LinkButton>
	<LinkButton href={resolve('/channels/auto-merge')} action="secondary">Auto Merge</LinkButton>
</p>
