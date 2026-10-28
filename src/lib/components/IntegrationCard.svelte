<script lang="ts" module>
	import type { IntegrationLogo as Logo } from '#lib/integrations/logo.ts';

	export type IntegrationView = {
		id: string;
		logo: Logo;
		name: string;
		note: string | null;
		consoleUrl: string;
		setup: {
			createAppUrl: string;
			steps: string[];
			clientIdLabel: string;
			clientSecretLabel: string;
		};
		clientId: string | null;
		redirectUri: string;
		autoRefresh: boolean;
		configured: boolean;
		/** Set-up integrations whose app this one can reuse (same family, e.g. Google). */
		reusable: { id: string; name: string; clientId: string }[];
		/** What to turn on in a shared app for this integration, e.g. "YouTube Data API v3". */
		api: string | null;
		account: {
			displayName: string;
			expiresAt: number | null;
			connectedAt: number;
			scopes: string[];
		} | null;
	};

	export type ClientFormState = {
		values: { clientId: string };
		errors: { clientId?: string; clientSecret?: string };
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { integrationStatus } from '#lib/integrations/status.ts';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import CopyField from './CopyField.svelte';
	import DateTime from './DateTime.svelte';
	import IntegrationLogo from './IntegrationLogo.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';
	import LinkButton from './LinkButton.svelte';
	import TextField from './TextField.svelte';

	let {
		integration,
		form,
		copied,
		oncopy
	}: {
		integration: IntegrationView;
		form: ClientFormState | null;
		/** Whether the redirect URL was just copied. */
		copied: boolean;
		oncopy: (text: string) => void;
	} = $props();

	const status = $derived(integrationStatus(integration.configured, integration.account));
	const connectHref = $derived(
		resolve('/integrations/[platform]/connect', { platform: integration.id })
	);
</script>

<article class="card" aria-labelledby="integration-{integration.id}">
	<header>
		<h2 id="integration-{integration.id}">
			<IntegrationLogo logo={integration.logo} />
			{integration.name}
		</h2>
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

	{#if integration.configured}
		<p class="card-note">
			Signs in through your {integration.name} app
			<code>{integration.clientId}</code>. Manage it in the
			<ExternalLink href={integration.consoleUrl}>developer console</ExternalLink>.
		</p>
		<footer>
			<LinkButton href={connectHref} reload action={integration.account ? 'secondary' : 'primary'}>
				{integration.account ? 'Reconnect' : 'Connect'}
			</LinkButton>
			{#if integration.account}
				<Form action="?/disconnect" label="Disconnect {integration.name}">
					<input type="hidden" name="platform" value={integration.id} />
					<Button type="submit" action="destructive">Disconnect</Button>
				</Form>
			{/if}
			<Form action="?/removeClient" label="Remove the {integration.name} app">
				<input type="hidden" name="platform" value={integration.id} />
				<Button type="submit" action="secondary">Change app</Button>
			</Form>
		</footer>
	{:else}
		{#each integration.reusable as app (app.id)}
			<section class="reuse-app" aria-labelledby="reuse-{app.id}">
				<h3 id="reuse-{app.id}">Use your {app.name} app</h3>
				<p>
					You already set up an app for {app.name} (<code>{app.clientId}</code>). It can sign in to {integration.name}
					too. Before connecting, open it in the
					<ExternalLink href={integration.consoleUrl}>developer console</ExternalLink>,
					{#if integration.api}enable the "{integration.api}" for its project,{/if}
					and add this redirect URL to the app:
				</p>
				<CopyField
					label="Redirect URL"
					value={integration.redirectUri}
					{copied}
					oncopy={() => oncopy(integration.redirectUri)}
				/>
				<Form action="?/reuseClient" label="Use the {app.name} app">
					<input type="hidden" name="from" value={app.id} />
					<footer><Button type="submit">Use the {app.name} app</Button></footer>
				</Form>
			</section>
		{/each}
		{#if integration.reusable.length}
			<h3>Or create a new app</h3>
		{/if}
		<p>
			{integration.name} only lets registered apps sign in on your behalf, so you create your own app
			once. It stays private to you and only ever acts as you.
		</p>
		{#if integration.note}
			<p class="card-note">{integration.note}</p>
		{/if}
		<p>
			<ExternalLink href={integration.setup.createAppUrl} action="primary">
				Create your {integration.name} app
			</ExternalLink>
		</p>
		<ol>
			{#each integration.setup.steps as step (step)}
				<li>{step}</li>
			{/each}
		</ol>
		<CopyField
			label="Redirect URL"
			value={integration.redirectUri}
			{copied}
			oncopy={() => oncopy(integration.redirectUri)}
		/>
		<Form action="?/saveClient" label="{integration.name} app credentials" variant="settings">
			<input type="hidden" name="platform" value={integration.id} />
			<TextField
				label={integration.setup.clientIdLabel}
				name="clientId"
				value={form?.values.clientId ?? ''}
				error={form?.errors.clientId}
				autocomplete="off"
				required
			/>
			<TextField
				label={integration.setup.clientSecretLabel}
				name="clientSecret"
				type="password"
				error={form?.errors.clientSecret}
				hint="Stored encrypted in this app's database."
				autocomplete="off"
				required
			/>
			<footer>
				<Button type="submit">Save app</Button>
			</footer>
		</Form>
	{/if}
</article>
