<script lang="ts" module>
	import type { ClientFormState, IntegrationView } from './IntegrationCard.svelte';

	export type OAuthPageData = {
		integration: IntegrationView;
		connected: boolean;
		error: string | null;
	};

	export type OAuthPageForm =
		| { disconnected: string }
		| { clientSaved: string }
		| { clientRemoved: string }
		| { clientReused: string }
		| { reuseError: string }
		| { client: ClientFormState & { platform: string } }
		| null
		| undefined;
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { Clipboard } from '#lib/clipboard.svelte.ts';
	import Alert from './Alert.svelte';
	import IntegrationCard from './IntegrationCard.svelte';
	import PageHeader from './PageHeader.svelte';

	let {
		data,
		form,
		children
	}: {
		data: OAuthPageData;
		form: OAuthPageForm;
		/** More of the integration's page, below the connection card. */
		children?: import('svelte').Snippet;
	} = $props();

	const clipboard = new Clipboard();
	const integration = $derived(data.integration);
</script>

<svelte:head>
	<title>{integration.name} · Social Sanity</title>
</svelte:head>

<PageHeader
	title={integration.name}
	back={{ href: resolve('/integrations'), label: 'Integrations' }}
>
	{#snippet lede()}
		You sign in on {integration.name}'s own page; Social Sanity only keeps an encrypted access
		token, never your password.
	{/snippet}
</PageHeader>

{#if data.connected}
	<Alert tone="ok">{integration.name} connected.</Alert>
{/if}
{#if data.error}
	<Alert tone="danger">{data.error}</Alert>
{/if}
{#if form && 'disconnected' in form}
	<Alert tone="ok">{form.disconnected} disconnected.</Alert>
{/if}
{#if form && 'clientSaved' in form}
	<Alert tone="ok">{form.clientSaved} app saved. Connect your account next.</Alert>
{/if}
{#if form && 'clientReused' in form}
	<Alert tone="ok">
		Using the {form.clientReused} app. Connect when its redirect URL and API are set up.
	</Alert>
{/if}
{#if form && 'reuseError' in form}
	<Alert tone="danger">{form.reuseError}</Alert>
{/if}
{#if form && 'clientRemoved' in form}
	<Alert tone="ok">{form.clientRemoved} app removed. Enter the new app's credentials.</Alert>
{/if}

<IntegrationCard
	{integration}
	form={form && 'client' in form ? form.client : null}
	copied={clipboard.copied === integration.redirectUri}
	oncopy={(text) => clipboard.copy(text)}
/>

{#if children}{@render children()}{/if}
