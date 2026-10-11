<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import IntegrationCard from '#lib/components/IntegrationCard.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import FtpCard from '#lib/components/FtpCard.svelte';
	import RepoCard from '#lib/components/RepoCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Integrations · Social Sanity</title>
</svelte:head>

<PageHeader title="Integrations">
	{#snippet lede()}
		Connect your social accounts. You sign in on each platform's own page; Social Sanity only keeps
		an encrypted access token, never your password.
	{/snippet}
</PageHeader>

{#if data.connected}
	<Alert tone="ok">{data.connected} connected.</Alert>
{/if}
{#if form && 'disconnected' in form}
	<Alert tone="ok">{form.disconnected} disconnected.</Alert>
{/if}
{#if data.error}
	<Alert tone="danger">{data.error}</Alert>
{/if}
{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}
{#if form && 'ftpSaved' in form}
	<Alert tone="ok">FTP settings saved. Use "Test connection" to check them.</Alert>
{/if}
{#if form && 'ftpRemoved' in form}
	<Alert tone="ok">FTP server removed.</Alert>
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
{#if form && 'ftpTest' in form && form.ftpTest}
	<Alert tone={form.ftpTest.ok ? 'ok' : 'danger'}>FTP: {form.ftpTest.message}</Alert>
{/if}

<CardGrid>
	{#each data.integrations as integration (integration.id)}
		<IntegrationCard {integration} />
	{/each}
	<RepoCard repo={data.repo} form={form && 'repo' in form ? (form.repo ?? null) : null} />
	<FtpCard server={data.ftp} form={form && 'ftp' in form ? (form.ftp ?? null) : null} />
</CardGrid>
