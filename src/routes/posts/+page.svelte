<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import Form from '#lib/components/Form.svelte';
	import Link from '#lib/components/Link.svelte';
	import LinkButton from '#lib/components/LinkButton.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { PLATFORMS } from '#lib/format/index.ts';
	import { statusLabel } from '#lib/posts/status.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const excerpt = (post: { title: string | null; text: string }) => {
		const text = post.title ?? post.text;
		return (text.length > 80 ? `${text.slice(0, 80)}…` : text) || '(no text)';
	};
</script>

<svelte:head>
	<title>Posts · Social Sanity</title>
</svelte:head>

<PageHeader title="Posts">
	{#snippet lede()}Posts from your repository, and where they have been published.{/snippet}
</PageHeader>

{#if !data.repo}
	<Alert tone="warn">
		No posts repository yet. Add one on the Settings page; posts are read from and written to it.
	</Alert>
{:else}
	{#if form?.sync}
		<Alert tone={form.sync.ok ? 'ok' : 'danger'}>{form.sync.message}</Alert>
	{/if}
	<p class="card-note">
		<code>{data.repo.url}</code>, branch <code>{data.repo.branch}</code>, folder
		<code>{data.repo.postsDir || '/'}</code>.
		{#if data.repo.lastSyncAt}
			Last pull <DateTime epochMs={data.repo.lastSyncAt} withTime />: {data.repo.lastSyncMessage}
		{:else}
			Not pulled yet.
		{/if}
	</p>
	<Form action="?/sync" label="Pull from repository">
		<footer>
			<LinkButton href={resolve('/posts/new')}>New post</LinkButton>
			<Button type="submit" action="secondary">Pull now</Button>
		</footer>
	</Form>

	<DataTable
		caption="Posts"
		columns={['Date', 'Post', 'Media', ...PLATFORMS.map((p) => p.name)]}
		rows={data.posts}
	>
		{#snippet row(post)}
			<td>{post.date ?? '—'}</td>
			<td>
				<Link href={resolve('/posts/[...id]', { id: post.id })}>{excerpt(post)}</Link>
				{#if post.error}<br /><small>{post.error}</small>{/if}
			</td>
			<td>{post.mediaCount}</td>
			{#each post.statuses as target (target.platform)}
				{@const status = statusLabel(target.status)}
				<td><Badge tone={status.tone}>{status.label}</Badge></td>
			{/each}
		{/snippet}
		{#snippet empty()}No posts in the repository yet. Start with “New post”.{/snippet}
	</DataTable>
{/if}
