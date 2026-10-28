<script lang="ts" module>
	export type ReferenceView = {
		source: 'GOOGLE_CONTACTS' | 'YOUTUBE' | 'REDDIT';
		externalReference: string;
	};
</script>

<script lang="ts">
	import { channelUrl } from '#lib/youtube/classify.ts';
	import ExternalLink from './ExternalLink.svelte';

	/** The outside records this human or company was collected from. */
	let { references }: { references: ReferenceView[] } = $props();

	const SOURCES = {
		GOOGLE_CONTACTS: 'Google Contacts',
		YOUTUBE: 'YouTube',
		REDDIT: 'Reddit'
	} as const;
</script>

{#if references.length}
	<p class="card-note">
		Linked to:
		{#each references as reference, i (`${reference.source}-${reference.externalReference}`)}
			{#if i},
			{/if}
			{#if reference.source === 'YOUTUBE'}
				<ExternalLink href={channelUrl(reference.externalReference)}>YouTube channel</ExternalLink>
			{:else}
				{SOURCES[reference.source]} <code>{reference.externalReference}</code>
			{/if}
		{/each}
	</p>
{/if}
