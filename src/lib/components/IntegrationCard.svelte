<script lang="ts" module>
	export type IntegrationView = {
		id: string;
		name: string;
		note: string | null;
		consoleUrl: string;
		requiredEnv: string[];
		redirectUri: string;
		autoRefresh: boolean;
		configured: boolean;
		account: {
			displayName: string;
			expiresAt: number | null;
			connectedAt: number;
			scopes: string[];
		} | null;
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { integrationStatus } from '#lib/integrations/status.ts';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import DateTime from './DateTime.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';
	import LinkButton from './LinkButton.svelte';

	let { integration }: { integration: IntegrationView } = $props();

	const status = $derived(integrationStatus(integration.configured, integration.account));
	const connectHref = $derived(
		resolve('/integrations/[platform]/connect', { platform: integration.id })
	);
</script>

<article class="card" aria-labelledby="integration-{integration.id}">
	<header>
		<h2 id="integration-{integration.id}">{integration.name}</h2>
		<Badge tone={status.tone}>{status.label}</Badge>
	</header>

	{#if integration.account}
		<dl>
			<dt>Account</dt>
			<dd>{integration.account.displayName}</dd>
			<dt>Connected</dt>
			<dd><DateTime epochMs={integration.account.connectedAt} /></dd>
			{#if integration.account.expiresAt !== null}
				<dt>Token expires</dt>
				<dd>
					<DateTime epochMs={integration.account.expiresAt} />
					{integration.autoRefresh ? '(renewed automatically)' : '(reconnect before then)'}
				</dd>
			{/if}
			<dt>Permissions</dt>
			<dd>{integration.account.scopes.join(', ') || '—'}</dd>
		</dl>
	{/if}

	{#if integration.note}
		<p class="card-note">{integration.note}</p>
	{/if}

	{#if integration.configured || integration.account}
		<footer>
			{#if integration.configured}
				<LinkButton
					href={connectHref}
					reload
					action={integration.account ? 'secondary' : 'primary'}
				>
					{integration.account ? 'Reconnect' : 'Connect'}
				</LinkButton>
			{/if}
			{#if integration.account}
				<Form action="?/disconnect" label="Disconnect {integration.name}">
					<input type="hidden" name="platform" value={integration.id} />
					<Button type="submit" action="destructive">Disconnect</Button>
				</Form>
			{/if}
		</footer>
	{/if}

	{#if !integration.configured}
		<p>
			To enable {integration.name}, create an app in the
			<ExternalLink href={integration.consoleUrl}>developer console</ExternalLink>, set
			{#each integration.requiredEnv as name, i (name)}<code>{name}</code>{i <
				integration.requiredEnv.length - 1
					? ' and '
					: ''}{/each}
			in <code>.env</code>, and restart the app.
		</p>
	{/if}

	<p class="card-note">
		Redirect URI to register: <code>{integration.redirectUri}</code>
	</p>
</article>
