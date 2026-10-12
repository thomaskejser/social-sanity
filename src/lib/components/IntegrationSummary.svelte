<script lang="ts" module>
	import type { IntegrationStatus } from '#lib/integrations/status.ts';

	import type { PlatformId } from '#lib/format/types.ts';

	export type IntegrationSummaryItem = {
		id: PlatformId;
		name: string;
		status: IntegrationStatus;
	};
</script>

<script lang="ts">
	import SocialLogo from '#lib/social-logos/SocialLogo.svelte';
	import Badge from './Badge.svelte';

	let { integrations }: { integrations: IntegrationSummaryItem[] } = $props();
</script>

<dl>
	{#each integrations as integration (integration.id)}
		<dt class="platform-name">
			<SocialLogo brand={integration.id} tone="brand" />{integration.name}
		</dt>
		<dd><Badge tone={integration.status.tone}>{integration.status.label}</Badge></dd>
	{/each}
</dl>
