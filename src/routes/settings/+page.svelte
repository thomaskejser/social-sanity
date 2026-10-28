<script lang="ts">
	import BackgroundJobsLink from '#lib/components/BackgroundJobsLink.svelte';
	import Credits from '#lib/components/Credits.svelte';
	import DatabaseBackup from '#lib/components/DatabaseBackup.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Settings · Social Sanity</title>
</svelte:head>

<PageHeader title="Settings" />

<DatabaseBackup apiEnabled={data.backupApiEnabled} />

<BackgroundJobsLink />

<Credits />
