<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import FtpCard from '#lib/components/FtpCard.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Blog site · Social Sanity</title>
</svelte:head>

<PageHeader title="Blog site" back={{ href: resolve('/integrations'), label: 'Integrations' }}>
	{#snippet lede()}
		Where your blog lives, uploaded to over FTP or SFTP. Images for social media posts are uploaded
		here too, so the platforms can fetch them.
	{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
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

<FtpCard server={data.ftp} form={form && 'ftp' in form ? (form.ftp ?? null) : null} />
