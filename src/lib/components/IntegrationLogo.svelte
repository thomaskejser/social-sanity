<script lang="ts">
	import googleContacts from '#lib/assets/google-contacts.svg';
	import type { IntegrationLogo } from '#lib/integrations/logo.ts';
	import SocialLogo from '#lib/social-logos/SocialLogo.svelte';
	import Icon from './Icon.svelte';

	const PRODUCTS = { 'google-contacts': googleContacts };

	let {
		logo,
		label
	}: {
		logo: IntegrationLogo;
		/** Accessible name when the logo carries meaning on its own; omit when text names it. */
		label?: string;
	} = $props();
</script>

{#if 'brand' in logo}
	<SocialLogo brand={logo.brand} tone="brand" {label} />
{:else if 'product' in logo}
	<img class="product-logo" src={PRODUCTS[logo.product]} alt={label ?? ''} title={label} />
{:else}
	<Icon name={logo.icon} {label} />
{/if}
