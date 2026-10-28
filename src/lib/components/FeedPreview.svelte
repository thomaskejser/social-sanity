<script lang="ts">
	import ArticleFrame from './ArticleFrame.svelte';
	import Icon from './Icon.svelte';

	/**
	 * The picture beside a feed item. A video's picture is a button that plays the video in its
	 * place; any other picture links to the article.
	 */
	let {
		title,
		imageUrl,
		videoId,
		href
	}: { title: string; imageUrl: string; videoId: string; href: string } = $props();

	let playing = $state(false);
</script>

<div class="feed-preview" data-playing={playing || undefined}>
	{#if videoId && playing}
		<ArticleFrame {title} {videoId} />
	{:else if videoId}
		<button type="button" aria-label="Play {title}" onclick={() => (playing = true)}>
			<img src={imageUrl} alt="" loading="lazy" referrerpolicy="no-referrer" />
			<Icon name="play" />
		</button>
	{:else}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is resolved by the caller or external -->
		<a {href} tabindex="-1" aria-hidden="true"
			><img src={imageUrl} alt="" loading="lazy" referrerpolicy="no-referrer" /></a
		>
	{/if}
</div>
