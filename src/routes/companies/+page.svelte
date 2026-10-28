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
		return `${resolve('/companies')}?${params}`;
	}

	function pageHref(n: number): string {
		return `${resolve('/companies')}?${new URLSearchParams({ q: data.search, page: String(n) })}`;
	}
</script>

<svelte:head>
	<title>Companies · Social Sanity</title>
</svelte:head>

<PageHeader title="Companies">
	{#snippet lede()}The companies you follow, in the same groups as your humans.{/snippet}
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
	page="company"
	error={form && 'groupError' in form ? form.groupError : undefined}
/>

<section class="human-search" aria-labelledby="find">
	<h2 id="find">Find a company</h2>
	<Form method="GET" label="Find companies" variant="inline">
		<AutocompleteField
			label="Name"
			name="q"
			source={resolve('/companies/suggest')}
			value={data.search}
			placeholder="Part of a name"
		/>
		<footer><Button type="submit">Search</Button></footer>
	</Form>
	{#if data.results}
		<MemberTable
			kind="company"
			rows={data.results.companies.map((c) => ({ ...c, id: c.companyId, name: c.company }))}
			pages={data.results.pages}
			href={pageHref}
			{groupNames}
		/>
	{:else}
		<p class="card-note">
			{data.total.toLocaleString()} companies. Search to find one; drag a result onto a group above to
			add it.
		</p>
	{/if}
</section>

<p>
	<LinkButton href={resolve('/companies/new')}>Add company</LinkButton>
	<LinkButton href={resolve('/companies/enrich')} action="secondary">Enrich</LinkButton>
	<LinkButton href={resolve('/companies/auto-merge')} action="secondary">Auto Merge</LinkButton>
</p>
