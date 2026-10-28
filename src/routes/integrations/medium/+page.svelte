<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import MediumCard from '#lib/components/MediumCard.svelte';
	import MediumExportUpload from '#lib/components/MediumExportUpload.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const check = $derived.by(() => {
		if (form && 'mediumCheckError' in form && form.mediumCheckError)
			return { tone: 'danger' as const, message: form.mediumCheckError };
		if (!form || !('mediumChecked' in form) || !form.mediumChecked) return null;
		const { username, name, feedUrl } = form.mediumChecked;
		return {
			tone: 'ok' as const,
			message: `The token works for @${username}${name ? ` (${name})` : ''}. Their stories' feed is ${feedUrl}.`
		};
	});
</script>

<svelte:head>
	<title>Medium · Social Sanity</title>
</svelte:head>

<PageHeader title="Medium" back={{ href: resolve('/integrations'), label: 'Integrations' }}>
	{#snippet lede()}Follow Medium writers, publications and tags through their feeds.{/snippet}
</PageHeader>

{#if form && 'mediumSaved' in form}
	<Alert tone="ok">Medium token variable saved.</Alert>
{/if}
{#if form && 'mediumRemoved' in form}
	<Alert tone="ok">Medium token variable removed.</Alert>
{/if}
<MediumCard
	medium={data.medium}
	form={form && 'medium' in form ? (form.medium ?? null) : null}
	{check}
/>

<MediumExportUpload
	result={form && 'mediumExport' in form ? (form.mediumExport ?? null) : null}
	reading={data.feedReading}
	error={form && 'exportError' in form ? form.exportError : undefined}
/>
