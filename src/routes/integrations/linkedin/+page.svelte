<script lang="ts">
	import OAuthIntegrationPage from '#lib/components/OAuthIntegrationPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<OAuthIntegrationPage {data} {form} />
