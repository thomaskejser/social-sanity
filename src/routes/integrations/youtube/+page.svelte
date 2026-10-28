<script lang="ts">
	import { resolve } from '$app/paths';
	import OAuthIntegrationPage from '#lib/components/OAuthIntegrationPage.svelte';
	import YouTubeChannels from '#lib/components/YouTubeChannels.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function channelsHref(n: number): string {
		return `${resolve('/integrations/youtube')}?${new URLSearchParams({ channels: String(n) })}`;
	}
</script>

<OAuthIntegrationPage {data} form={form && 'youtube' in form ? null : form}>
	<YouTubeChannels
		channels={data.channels}
		counts={data.counts}
		pages={data.pages}
		href={channelsHref}
		connected={data.hasAccount}
		claudeConfigured={data.claudeConfigured}
		sorting={data.sorting}
		message={form && 'youtube' in form ? (form.youtube ?? null) : null}
	/>
</OAuthIntegrationPage>
