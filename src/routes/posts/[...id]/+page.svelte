<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import AutoRefresh from '#lib/components/AutoRefresh.svelte';
	import Button from '#lib/components/Button.svelte';
	import CardGrid from '#lib/components/CardGrid.svelte';
	import Form from '#lib/components/Form.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PostCard from '#lib/components/PostCard.svelte';
	import { platformFormat } from '#lib/format/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const publishing = $derived(data.platforms.some((p) => p.status === 'publishing'));
	const allPublished = $derived(data.platforms.every((p) => p.status === 'published'));
</script>

<svelte:head>
	<title>{data.post.title ?? 'Preview post'} · Social Sanity</title>
</svelte:head>

<AutoRefresh active={publishing} />

<PageHeader title={data.post.title ?? 'Preview'}>
	{#snippet lede()}
		<code>{data.post.repoPath}</code> in the posts repository. Edit the text per platform, then publish
		to one or all of them. Edits and publish results are committed to the repository.
	{/snippet}
</PageHeader>

{#if data.pushFailed}
	<Alert tone="warn">
		The post was committed in the local clone but could not be pushed. It is pushed on the next
		pull.
	</Alert>
{/if}
{#each data.post.problems as problem (problem)}
	<Alert tone="danger">{problem}</Alert>
{/each}
{#if form && 'saved' in form}
	<Alert tone="ok">{form.saved ? 'Changes committed.' : 'Nothing changed.'}</Alert>
{/if}
{#if form && 'warning' in form && form.warning}
	<Alert tone="warn">{form.warning}</Alert>
{/if}
{#if form && 'started' in form && form.started?.length}
	<Alert tone="info">
		Publishing to {form.started.map((id) => platformFormat(id).name).join(' and ')}…
	</Alert>
{/if}
{#if form && 'skipped' in form}
	{#each form.skipped ?? [] as skipped (skipped.platform)}
		<Alert tone="warn">{skipped.reason}</Alert>
	{/each}
{/if}
{#if form && 'message' in form && form.message}
	<Alert tone="danger">{form.message}</Alert>
{/if}

<Form action="?/save" label="Post versions" variant="preview" resetOnSuccess={false}>
	<CardGrid>
		{#each data.platforms as platform (platform.id)}
			<PostCard
				platformId={platform.id}
				author={platform.account?.displayName ?? null}
				accountProblem={platform.accountProblem}
				media={data.media}
				generated={platform.generated}
				savedText={platform.text}
				status={platform.status}
				error={platform.error}
				remoteUrl={platform.remoteUrl}
			/>
		{/each}
	</CardGrid>
	{#if !allPublished}
		<footer>
			<Button type="submit" action="secondary">Save changes</Button>
			<Button type="submit" formaction="?/publish" name="platform" value="all">
				Publish to all
			</Button>
		</footer>
	{/if}
</Form>

<Form action="?/delete" label="Delete post">
	<footer>
		<Button type="submit" action="destructive" disabled={publishing}>Delete from repository</Button>
	</footer>
</Form>
