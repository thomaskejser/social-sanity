<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import IntegrationCard from '#lib/components/IntegrationCard.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import FtpCard from '#lib/components/FtpCard.svelte';
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
	<Alert kind="success">{data.connected} connected.</Alert>
{/if}
{#if form && 'disconnected' in form}
	<Alert kind="success">{form.disconnected} disconnected.</Alert>
{/if}
{#if data.error}
	<Alert kind="error">{data.error}</Alert>
{/if}
{#if form && 'error' in form}
	<Alert kind="error">{form.error}</Alert>
{/if}
{#if form && 'ftpSaved' in form}
	<Alert kind="success">FTP settings saved. Use "Test connection" to check them.</Alert>
{/if}
{#if form && 'ftpRemoved' in form}
	<Alert kind="success">FTP server removed.</Alert>
{/if}
{#if form && 'ftpTest' in form && form.ftpTest}
	<Alert kind={form.ftpTest.ok ? 'success' : 'error'}>FTP: {form.ftpTest.message}</Alert>
{/if}

<CardGrid>
	{#each data.integrations as integration (integration.id)}
		<IntegrationCard {integration} />
	{/each}
	<FtpCard server={data.ftp} form={form && 'ftp' in form ? (form.ftp ?? null) : null} />
</CardGrid>
