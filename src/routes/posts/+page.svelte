<script lang="ts">
	import { resolve } from '$app/paths';
	import Badge from '#lib/components/Badge.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import Link from '#lib/components/Link.svelte';
	import LinkButton from '#lib/components/LinkButton.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { PLATFORMS } from '#lib/format/index.ts';
	import { statusLabel } from '#lib/posts/status.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const excerpt = (text: string) =>
		(text.length > 80 ? `${text.slice(0, 80)}…` : text) || '(no text)';
</script>

<svelte:head>
	<title>Posts · Social Sanity</title>
</svelte:head>

<PageHeader title="Posts">
	{#snippet lede()}Everything you have written, and where it has been published.{/snippet}
</PageHeader>

<LinkButton href={resolve('/posts/new')}>New post</LinkButton>

<DataTable
	caption="Posts"
	columns={['Created', 'Post', 'Media', ...PLATFORMS.map((p) => p.name)]}
	rows={data.posts}
>
	{#snippet row(post)}
		<td><DateTime epochMs={post.createdAt} /></td>
		<td>
			<Link href={resolve('/posts/[id]', { id: String(post.id) })}>{excerpt(post.text)}</Link>
		</td>
		<td>{post.mediaCount}</td>
		{#each PLATFORMS as platform (platform.id)}
			{@const target = post.targets.find((t) => t.platform === platform.id)}
			<td>
				{#if target}
					{@const status = statusLabel(target.status)}
					<Badge tone={status.tone}>{status.label}</Badge>
				{/if}
			</td>
		{/each}
	{/snippet}
	{#snippet empty()}No posts yet. Start with “New post”.{/snippet}
</DataTable>
