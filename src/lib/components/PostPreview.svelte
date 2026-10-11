<script lang="ts">
	import type { PlatformFormat } from '#lib/format/types.ts';
	import MediaGallery, { type MediaView } from './MediaGallery.svelte';
	import PostText from './PostText.svelte';

	let {
		platform,
		author,
		text,
		media
	}: { platform: PlatformFormat; author: string; text: string; media: MediaView[] } = $props();
</script>

<section class="post-preview" aria-label="{platform.name} preview">
	<p class="post-author">{author}</p>
	{#if platform.mediaFirst}
		<MediaGallery {media} label="{platform.name} media" />
	{/if}
	{#if text}
		<PostText
			{text}
			foldAt={platform.foldAt}
			foldLines={platform.foldLines}
			linksClickable={platform.linksClickable}
		/>
	{/if}
	{#if !platform.mediaFirst}
		<MediaGallery {media} label="{platform.name} media" />
	{/if}
</section>
