<script lang="ts">
	import { resolve } from '$app/paths';
	import ChannelForm from '#lib/components/ChannelForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Add channel · Social Sanity</title>
</svelte:head>

<PageHeader title="Add channel" back={{ href: resolve('/channels'), label: 'All channels' }}>
	{#snippet lede()}Social media accounts and sources are added on the channel's page next.{/snippet}
</PageHeader>

<ChannelForm
	channel={{ channel: '', website: '', notes: '' }}
	errors={form?.channelErrors ?? null}
	submitLabel="Add channel"
/>
