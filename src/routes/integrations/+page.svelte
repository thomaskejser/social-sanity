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
{#if form && 'clientSaved' in form}
	<Alert tone="ok">{form.clientSaved} app saved. Connect your account next.</Alert>
{/if}
{#if form && 'clientRemoved' in form}
	<Alert tone="ok">{form.clientRemoved} app removed. Enter the new app's credentials.</Alert>
{/if}
{#if form && 'ftpSaved' in form}
	<Alert tone="ok">FTP settings saved. Use "Test connection" to check them.</Alert>
{/if}
{#if form && 'ftpRemoved' in form}
	<Alert tone="ok">FTP server removed.</Alert>
{/if}
{#if form && 'ftpTest' in form && form.ftpTest}
	<Alert tone={form.ftpTest.ok ? 'ok' : 'danger'}>FTP: {form.ftpTest.message}</Alert>
{/if}

<CardGrid>
	{#each data.integrations as integration (integration.id)}
		<IntegrationCard
			{integration}
			form={form && 'client' in form && form.client?.platform === integration.id
				? form.client
				: null}
		/>
	{/each}
	<FtpCard server={data.ftp} form={form && 'ftp' in form ? (form.ftp ?? null) : null} />
</CardGrid>
