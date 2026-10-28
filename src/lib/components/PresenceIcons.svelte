<script lang="ts">
	import type { PresenceAccount } from '#lib/members/presence.ts';
	import { socialLogos } from '#lib/social-logos/social-logos.ts';
	import SocialLogo from '#lib/social-logos/SocialLogo.svelte';
	import ExternalLink from './ExternalLink.svelte';

	/** A small logo per social media account, each linking to the profile. */
	let { accounts = [] }: { accounts?: PresenceAccount[] } = $props();
</script>

{#if accounts.length}
	<span class="presence-icons">
		{#each accounts as account (account.url)}
			<ExternalLink href={account.url}
				><SocialLogo
					brand={account.platform}
					label={socialLogos[account.platform].title}
				/></ExternalLink
			>
		{/each}
	</span>
{/if}
