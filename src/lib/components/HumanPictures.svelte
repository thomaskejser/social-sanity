<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from './Button.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';

	/** A human's pictures, the one shown first, with buttons to show another or remove one. */
	let {
		humanId,
		pictures
	}: { humanId: number; pictures: { humanAvatarId: number; sourceUrl: string }[] } = $props();

	function host(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}
</script>

<section class="card" aria-labelledby="pictures">
	<header><h2 id="pictures">Pictures</h2></header>
	<p class="card-note">The first picture represents them across the app. Enrich finds more.</p>
	<ul class="picture-list">
		{#each pictures as picture, i (picture.humanAvatarId)}
			<li>
				<img
					class="choice-picture"
					src={resolve('/avatars/[kind]/[id]/[picture]', {
						kind: 'human',
						id: String(humanId),
						picture: String(picture.humanAvatarId)
					})}
					alt={i === 0 ? 'Shown picture' : ''}
					width="80"
					height="80"
					loading="lazy"
				/>
				<div>
					{#if picture.sourceUrl.startsWith('https://')}
						<ExternalLink href={picture.sourceUrl}>{host(picture.sourceUrl)}</ExternalLink>
					{/if}
					<footer>
						{#if i === 0}
							<strong>Shown</strong>
						{:else}
							<Form action="?/showPicture" label="Show this picture">
								<input type="hidden" name="humanAvatarId" value={picture.humanAvatarId} />
								<Button type="submit" action="inline">Show this one</Button>
							</Form>
						{/if}
						<Form action="?/removePicture" label="Remove this picture">
							<input type="hidden" name="humanAvatarId" value={picture.humanAvatarId} />
							<Button type="submit" action="inline">Remove</Button>
						</Form>
					</footer>
				</div>
			</li>
		{:else}
			<li>No pictures yet.</li>
		{/each}
	</ul>
</section>
