<script lang="ts" module>
	import type { IntegrationLogo as Logo } from '#lib/integrations/logo.ts';
	import type { Tone } from '#lib/tone.ts';

	export type IntegrationSlug =
		| 'linkedin'
		| 'instagram'
		| 'google'
		| 'youtube'
		| 'reddit'
		| 'medium'
		| 'blog-site'
		| 'posts-repository'
		| 'claude';

	export type IntegrationListItem = {
		slug: IntegrationSlug;
		name: string;
		logo: Logo;
		status: { tone: Tone; label: string };
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import IntegrationLogo from './IntegrationLogo.svelte';
	import Icon from './Icon.svelte';

	let { integrations }: { integrations: IntegrationListItem[] } = $props();

	const HREFS = {
		linkedin: resolve('/integrations/linkedin'),
		instagram: resolve('/integrations/instagram'),
		google: resolve('/integrations/google'),
		youtube: resolve('/integrations/youtube'),
		reddit: resolve('/integrations/reddit'),
		medium: resolve('/integrations/medium'),
		'blog-site': resolve('/integrations/blog-site'),
		'posts-repository': resolve('/integrations/posts-repository'),
		claude: resolve('/integrations/claude')
	} satisfies Record<IntegrationSlug, string>;
</script>

<ul class="integration-list">
	{#each integrations as item (item.slug)}
		<li>
			<a href={HREFS[item.slug]}>
				<IntegrationLogo logo={item.logo} />
				<span>{item.name}</span>
				{#if item.status.tone === 'ok'}
					<span class="integration-status" data-tone="ok">
						<Icon name="check" label={item.status.label} />
					</span>
				{:else}
					<span class="integration-status" data-tone={item.status.tone}>{item.status.label}</span>
				{/if}
			</a>
		</li>
	{/each}
</ul>
