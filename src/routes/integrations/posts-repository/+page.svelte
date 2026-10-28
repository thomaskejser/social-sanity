<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RepoCard from '#lib/components/RepoCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Posts repository · Social Sanity</title>
</svelte:head>

<PageHeader
	title="Posts repository"
	back={{ href: resolve('/integrations'), label: 'Integrations' }}
>
	{#snippet lede()}
		The git repository holding the posts you write under Contribute.
	{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'repoSaved' in form}
	<Alert tone="ok">Repository settings saved.</Alert>
{/if}
{#if form && 'repoSync' in form && form.repoSync}
	<Alert tone={form.repoSync.ok ? 'ok' : 'danger'}>Repository: {form.repoSync.message}</Alert>
{/if}
{#if form && 'repoTest' in form && form.repoTest}
	<Alert tone={form.repoTest.ok ? 'ok' : 'danger'}>Repository: {form.repoTest.message}</Alert>
{/if}
{#if form && 'repoRemoved' in form}
	<Alert tone="ok">Repository removed.</Alert>
{/if}

<RepoCard repo={data.repo} form={form && 'repo' in form ? (form.repo ?? null) : null} />
