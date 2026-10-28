<script lang="ts">
	import { resolve } from '$app/paths';
	import OAuthIntegrationPage from '#lib/components/OAuthIntegrationPage.svelte';
	import RedditSubscriptions from '#lib/components/RedditSubscriptions.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function importedHref(n: number): string {
		return `${resolve('/integrations/reddit')}?${new URLSearchParams({ imported: String(n) })}`;
	}
</script>

<OAuthIntegrationPage {data} form={form && 'reddit' in form ? null : form}>
	<RedditSubscriptions
		imported={data.imported}
		pages={data.pages}
		href={importedHref}
		connected={data.redditConnected}
		message={form && 'reddit' in form ? (form.reddit ?? null) : null}
	/>
</OAuthIntegrationPage>
