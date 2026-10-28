<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import ClaudeCard from '#lib/components/ClaudeCard.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const check = $derived.by(() => {
		if (form && 'claudeCodeError' in form && form.claudeCodeError)
			return { tone: 'danger' as const, message: form.claudeCodeError };
		if (!form || !('claudeCodeChecked' in form) || !form.claudeCodeChecked) return null;
		const { email, plan } = form.claudeCodeChecked;
		return {
			tone: 'ok' as const,
			message: `Claude Code works${email ? `, signed in as ${email}` : ''}${plan ? ` (${plan})` : ''}.`
		};
	});
</script>

<svelte:head>
	<title>AI (Claude) · Social Sanity</title>
</svelte:head>

<PageHeader title="AI (Claude)" back={{ href: resolve('/integrations'), label: 'Integrations' }}>
	{#snippet lede()}Which AI the app's AI features use, and how it reaches it. Claude is the one
		supported today.{/snippet}
</PageHeader>

{#if form && 'claudeSaved' in form}
	<Alert tone="ok">
		{form.claudeSaved === 'LOCAL'
			? 'Claude runs locally with Claude Code.'
			: 'Claude API token variable saved.'}
	</Alert>
{/if}
{#if form && 'claudeRemoved' in form}
	<Alert tone="ok">Claude settings removed.</Alert>
{/if}
<ClaudeCard
	claude={data.claude}
	form={form && 'claude' in form ? (form.claude ?? null) : null}
	{check}
/>
