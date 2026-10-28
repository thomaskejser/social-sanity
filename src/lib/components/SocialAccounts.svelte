<script lang="ts">
	import { accountHandle, type SocialAccount } from '#lib/social-accounts.ts';
	import { socialLogos } from '#lib/social-logos/social-logos.ts';
	import SocialLogo from '#lib/social-logos/SocialLogo.svelte';
	import Button from './Button.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';

	/** A human's or company's social media accounts, with a form to link another. */
	let { accounts, error }: { accounts: SocialAccount[]; error?: string } = $props();
</script>

<section class="card" aria-labelledby="social-accounts">
	<header><h2 id="social-accounts">Social media</h2></header>
	<ul class="detail-list">
		{#each accounts as account (account.socialAccountId)}
			<li>
				<SocialLogo
					brand={account.platform}
					tone="brand"
					label={socialLogos[account.platform].title}
				/>
				<ExternalLink href={account.url}>{accountHandle(account.url)}</ExternalLink>
				<Form action="?/removeSocialAccount" label="Remove {account.url}">
					<input type="hidden" name="socialAccountId" value={account.socialAccountId} />
					<Button type="submit" action="inline">Remove</Button>
				</Form>
			</li>
		{:else}
			<li>No accounts linked yet.</li>
		{/each}
	</ul>
	<Form action="?/addSocialAccount" label="Link a social media account" variant="detail">
		<TextField
			label="Profile address"
			name="url"
			type="url"
			placeholder="https://www.linkedin.com/in/…"
			hint="LinkedIn, Instagram, X, Bluesky, Mastodon, Facebook, YouTube, GitHub, TikTok and more."
			{error}
			required
		/>
		<footer><Button type="submit" action="secondary">Link account</Button></footer>
	</Form>
</section>
