<script lang="ts" module>
	export type MediaView = {
		kind: 'image' | 'video';
		mimeType: string;
		originalName: string;
		url: string;
	};
</script>

<script lang="ts">
	let { media, label }: { media: MediaView[]; label: string } = $props();
</script>

{#if media.length > 0}
	<ul class="media-gallery" aria-label={label}>
		{#each media as item, i (item.url)}
			<li>
				{#if item.kind === 'image'}
					<img src={item.url} alt={item.originalName} loading="lazy" />
				{:else}
					<video src={item.url} controls muted playsinline preload="metadata">
						<track kind="captions" />
						{item.originalName}
					</video>
				{/if}
				{#if media.length > 1}
					<small>{i + 1} / {media.length}</small>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
