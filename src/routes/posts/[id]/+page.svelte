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

	const publishing = $derived(data.platforms.some((p) => p.target.status === 'publishing'));
	const allPublished = $derived(data.platforms.every((p) => p.target.status === 'published'));
</script>

<svelte:head>
	<title>Preview post · Social Sanity</title>
</svelte:head>

<AutoRefresh active={publishing} />

<PageHeader title="Preview">
	{#snippet lede()}
		How the post will look on each platform. Edit the text per platform, then publish to one or all
		of them.
	{/snippet}
</PageHeader>

{#if form && 'saved' in form}
	<Alert tone="ok">Changes saved.</Alert>
{/if}
{#if form && 'started' in form && form.started?.length}
	<Alert tone="info">
		Publishing to {form.started?.map((id) => platformFormat(id).name).join(' and ')}…
	</Alert>
{/if}
{#if form && 'skipped' in form}
	{#each form.skipped as skipped (skipped.platform)}
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
				savedText={platform.target.text}
				status={platform.target.status}
				error={platform.target.error}
				remoteUrl={platform.target.remoteUrl}
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
		<Button type="submit" action="destructive" disabled={publishing}>Delete post</Button>
	</footer>
</Form>
