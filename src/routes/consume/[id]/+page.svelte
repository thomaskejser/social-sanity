<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import ArticleFrame from '#lib/components/ArticleFrame.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import LeaveLink from '#lib/components/LeaveLink.svelte';
	import MakeTaskButton from '#lib/components/MakeTaskButton.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const article = $derived(data.article);
</script>

<svelte:head>
	<title>{article.article} · Social Sanity</title>
</svelte:head>

<PageHeader title={article.article} back={{ href: resolve('/consume'), label: 'Feed' }}>
	{#snippet lede()}
		{article.owner} · <DateTime epochMs={article.publishedAt} />
	{/snippet}
</PageHeader>

{#if form && 'taskAdded' in form}
	<Alert tone="ok">Added to your tasks under “{form.taskAdded}”.</Alert>
{/if}
{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}

<footer class="article-actions">
	<MakeTaskButton
		task="Read: {article.article}"
		description={`${article.owner}\n${article.url}`}
		variant="secondary"
	/>
	<LeaveLink href={article.url}>Original</LeaveLink>
</footer>

{#if article.videoId && article.summary}
	<p>{article.summary}</p>
{/if}
<ArticleFrame title={article.article} document={article.document} videoId={article.videoId} />
