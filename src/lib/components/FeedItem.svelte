<script lang="ts" module>
	export type FeedItemView = {
		articleId: number;
		article: string;
		summary: string;
		readable: boolean;
		videoId: string;
		/** A picture for the preview; '' when none is known. */
		imageUrl: string;
		url: string;
		publishedAt: number;
		owner: string;
		humanId: number | null;
		companyId: number | null;
		channelId: number | null;
		publisherId: number | null;
		kudos: number;
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from './Button.svelte';
	import DateTime from './DateTime.svelte';
	import FeedPreview from './FeedPreview.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';
	import KudosBar from './KudosBar.svelte';
	import LeaveLink from './LeaveLink.svelte';
	import MakeTaskButton from './MakeTaskButton.svelte';
	import Link from './Link.svelte';

	let { item }: { item: FeedItemView } = $props();
	const id = $props.id();
	const articleHref = $derived(
		item.readable ? resolve('/consume/[id]', { id: String(item.articleId) }) : item.url
	);

	const owner = $derived(
		item.humanId !== null
			? { ownerKind: 'human', ownerId: item.humanId }
			: item.companyId !== null
				? { ownerKind: 'company', ownerId: item.companyId }
				: item.channelId !== null
					? { ownerKind: 'channel', ownerId: item.channelId }
					: { ownerKind: 'publisher', ownerId: item.publisherId ?? 0 }
	);
</script>

<article class="feed-item" aria-labelledby={id} data-preview={item.imageUrl ? true : undefined}>
	<div class="feed-body">
		<header>
			<h2 {id}>
				{#if item.readable}
					<Link href={resolve('/consume/[id]', { id: String(item.articleId) })}>{item.article}</Link
					>
				{:else}
					{item.article}
				{/if}
			</h2>
			<p>
				{item.owner} · <DateTime epochMs={item.publishedAt} />
			</p>
			<KudosBar kudos={item.kudos} action="?/kudos" label={item.owner} fields={owner} />
		</header>
		{#if item.summary}<p>{item.summary}</p>{/if}
		<footer>
			{#if item.readable}
				<Link href={resolve('/consume/[id]', { id: String(item.articleId) })}>Read here</Link>
			{:else}
				<LeaveLink href={item.url}>Read on the source's site</LeaveLink>
			{/if}
			<MakeTaskButton task="Read: {item.article}" description={`${item.owner}\n${item.url}`} />
			<Form action="?/markRead" label="Mark {item.article} as read">
				<input type="hidden" name="articleId" value={item.articleId} />
				<Button type="submit" action="inline" busyLabel="Hiding…"
					><Icon name="check" />Mark as read</Button
				>
			</Form>
		</footer>
	</div>
	{#if item.imageUrl}
		<FeedPreview
			title={item.article}
			imageUrl={item.imageUrl}
			videoId={item.videoId}
			href={articleHref}
		/>
	{/if}
</article>
