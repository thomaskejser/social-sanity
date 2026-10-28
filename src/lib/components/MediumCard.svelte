<script lang="ts" module>
	export type MediumView = { tokenEnvVar: string | null; tokenSet: boolean };
	export type MediumFormState = { values: { tokenEnvVar: string }; error: string };
	/** The outcome of "Check token". */
	export type MediumCheck = { tone: 'ok' | 'danger'; message: string };
</script>

<script lang="ts">
	import Alert from './Alert.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import IntegrationLogo from './IntegrationLogo.svelte';
	import TextField from './TextField.svelte';

	let {
		medium,
		form,
		check
	}: { medium: MediumView; form: MediumFormState | null; check: MediumCheck | null } = $props();

	const status = $derived(
		!medium.tokenEnvVar
			? { tone: 'neutral' as const, label: 'Feeds only' }
			: medium.tokenSet
				? { tone: 'ok' as const, label: 'Token set' }
				: { tone: 'warn' as const, label: 'Variable not set' }
	);
</script>

<article class="card" aria-labelledby="integration-medium">
	<header>
		<h2 id="integration-medium"><IntegrationLogo logo={{ brand: 'medium' }} />Medium</h2>
		<Badge tone={status.tone}>{status.label}</Badge>
	</header>

	<section class="card-note" aria-label="Following Medium writers">
		<p>Follow Medium writers without a token:</p>
		<ul>
			<li>
				Add a profile (<code>medium.com/@name</code> or <code>name.medium.com</code>), publication (<code
					>medium.com/publication</code
				>) or tag (<code>medium.com/tag/topic</code>) URL as a content source. The app reads its RSS
				feed.
			</li>
			<li>A link to one of their stories works too; it follows the writer or publication.</li>
			<li>Stories behind Medium's paywall show only their opening in the feed.</li>
		</ul>
	</section>

	<section class="card-note" aria-label="Integration token">
		<p>
			Medium no longer issues integration tokens and accepts no new API integrations, so posts can't
			be published to Medium from here. A token created before that still works: put it in an
			environment variable and enter the variable's name to check it. The token itself is never
			stored.
		</p>
	</section>

	{#if medium.tokenEnvVar && !medium.tokenSet}
		<Alert tone="warn">
			<code>{medium.tokenEnvVar}</code> is not set. Add it to the server environment and restart the app.
		</Alert>
	{/if}

	<Form action="?/saveMedium" label="Medium" resetOnSuccess={false}>
		<TextField
			label="Environment variable"
			name="tokenEnvVar"
			value={form?.values.tokenEnvVar ?? medium.tokenEnvVar ?? 'SOCIAL_SANITY_MEDIUM_TOKEN'}
			error={form?.error}
			autocomplete="off"
			required
		/>

		<footer>
			<Button type="submit">Save</Button>
			{#if medium.tokenEnvVar}
				<Button
					type="submit"
					action="secondary"
					formaction="?/checkMedium"
					busyLabel="Checking token…"
				>
					Check token
				</Button>
				<Button type="submit" action="secondary" formaction="?/removeMedium">Remove</Button>
			{/if}
		</footer>
		{#if check}
			<Alert tone={check.tone}>{check.message}</Alert>
		{/if}
	</Form>
</article>
