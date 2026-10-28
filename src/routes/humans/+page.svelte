<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import AutocompleteField from '#lib/components/AutocompleteField.svelte';
	import ConvertedNotice from '#lib/components/ConvertedNotice.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import GroupList from '#lib/components/GroupList.svelte';
	import MemberTable from '#lib/components/MemberTable.svelte';
	import LinkButton from '#lib/components/LinkButton.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const groupNames = $derived(new Map(data.groups.map((g) => [g.humanGroupId, g.humanGroup])));

	function ungroupedHref(n: number): string {
		const params = new URLSearchParams({
			...(data.search ? { q: data.search } : {}),
			ungrouped: String(n)
		});
		return `${resolve('/humans')}?${params}`;
	}

	function pageHref(n: number): string {
		return `${resolve('/humans')}?${new URLSearchParams({ q: data.search, page: String(n) })}`;
	}
</script>

<svelte:head>
	<title>Humans · Social Sanity</title>
</svelte:head>

<PageHeader title="Humans">
	{#snippet lede()}Everyone you know, and the groups you keep them in.{/snippet}
</PageHeader>

{#if form && 'casingFixed' in form}
	<Alert tone="ok">
		Fixed the casing of {form.casingFixed}
		{form.casingFixed === 1 ? 'human' : 'humans'}.
	</Alert>
{/if}
{#if form && 'converted' in form && form.converted}
	<ConvertedNotice converted={form.converted} />
{/if}
{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'imported' in form && form.imported}
	<Alert tone={form.imported.skippedPhones ? 'warn' : 'ok'}>
		Imported from Google Contacts: {form.imported.created} new; {form.imported.existing} already here
		were left as they are.
		{#if form.imported.deleted}
			{form.imported.deleted} you deleted were not imported again.
		{/if}
		{#if form.imported.skippedPhones}
			{form.imported.skippedPhones} phone numbers had no country code and were skipped; add them with
			the code on the human's page.
		{/if}
	</Alert>
{/if}

<GroupList
	groups={data.groups}
	ungrouped={data.ungrouped}
	{ungroupedHref}
	page="human"
	error={form && 'groupError' in form ? form.groupError : undefined}
/>

<section class="human-search" aria-labelledby="find">
	<h2 id="find">Find a human</h2>
	<Form method="GET" label="Find humans" variant="inline">
		<AutocompleteField
			label="Name"
			name="q"
			source={resolve('/humans/suggest')}
			value={data.search}
			placeholder="Part of a name"
		/>
		<footer><Button type="submit">Search</Button></footer>
	</Form>
	{#if data.results}
		<MemberTable
			kind="human"
			rows={data.results.humans.map((h) => ({ ...h, id: h.humanId, name: h.human }))}
			pages={data.results.pages}
			href={pageHref}
			{groupNames}
		/>
	{:else}
		<p class="card-note">
			{data.total.toLocaleString()} humans. Search to find someone; drag a result onto a group above to
			add them.
		</p>
	{/if}
</section>

<Form action="?/importGoogle" label="Humans">
	<footer>
		<LinkButton href={resolve('/humans/new')}>Add human</LinkButton>
		<LinkButton href={resolve('/humans/enrich')} action="secondary">Enrich</LinkButton>
		<LinkButton href={resolve('/humans/auto-merge')} action="secondary">Auto Merge</LinkButton>
		{#if data.casingFixes}
			<Button type="submit" action="secondary" formaction="?/fixCasing"
				>Fix casing ({data.casingFixes})</Button
			>
		{/if}
		{#if data.googleConnected}
			<Button type="submit" action="secondary">Import Google Contacts now</Button>
		{/if}
	</footer>
</Form>
