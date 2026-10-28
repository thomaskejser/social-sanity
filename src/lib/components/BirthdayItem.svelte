<script lang="ts">
	import { resolve } from '$app/paths';
	import FeedPreview from './FeedPreview.svelte';
	import Link from './Link.svelte';

	/** A human's coming birthday, as an entry in the Consume feed. */
	let {
		birthday
	}: {
		birthday: {
			humanId: number;
			human: string;
			day: string;
			daysUntil: number;
			age: number | null;
			avatar: boolean;
		};
	} = $props();
	const id = $props.id();

	const href = $derived(resolve('/humans/[id]', { id: String(birthday.humanId) }));
	const title = $derived(
		`Birthday: ${birthday.human}${birthday.age === null ? '' : ` - age: ${birthday.age}`}`
	);
	const when = $derived(
		birthday.daysUntil === 0
			? 'Today'
			: birthday.daysUntil === 1
				? 'Tomorrow'
				: new Date(`${birthday.day}T00:00:00`).toLocaleDateString(undefined, {
						weekday: 'long',
						day: 'numeric',
						month: 'long'
					})
	);
</script>

<article
	class="feed-item"
	aria-labelledby={id}
	data-preview={birthday.avatar ? true : undefined}
	data-birthday
>
	<div class="feed-body">
		<header>
			<h2 {id}><Link {href}>{title}</Link></h2>
			<p>{when}</p>
		</header>
	</div>
	{#if birthday.avatar}
		<FeedPreview
			{title}
			imageUrl={resolve('/avatars/[kind]/[id]', { kind: 'human', id: String(birthday.humanId) })}
			videoId=""
			{href}
		/>
	{/if}
</article>
