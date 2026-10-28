<script lang="ts" module>
	export type ClaudeView = {
		mode: 'API' | 'LOCAL' | null;
		tokenEnvVar: string | null;
		tokenSet: boolean;
	};
	export type ClaudeFormState = { values: { tokenEnvVar: string }; error: string };
	/** The outcome of "Check Claude Code". */
	export type ClaudeCheck = { tone: 'ok' | 'danger'; message: string };
</script>

<script lang="ts">
	import Alert from './Alert.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';
	import RadioGroup from './RadioGroup.svelte';
	import TextField from './TextField.svelte';

	let {
		claude,
		form,
		check
	}: { claude: ClaudeView; form: ClaudeFormState | null; check: ClaudeCheck | null } = $props();

	const saved = $derived(claude.mode ?? (claude.tokenEnvVar ? 'API' : null));
	let mode = $derived<string>(form ? 'API' : (saved ?? ''));

	const status = $derived(
		saved === 'LOCAL'
			? { tone: 'ok' as const, label: 'Runs locally' }
			: !claude.tokenEnvVar
				? { tone: 'neutral' as const, label: 'Not configured' }
				: claude.tokenSet
					? { tone: 'ok' as const, label: 'Token set' }
					: { tone: 'warn' as const, label: 'Variable not set' }
	);

	const MODES = [
		{
			value: 'LOCAL',
			label: 'Run locally with Claude Code',
			description: 'Uses the Claude login of Claude Code on this computer. No API token needed.'
		},
		{
			value: 'API',
			label: 'Use a Claude API token',
			description: 'Calls the Claude API with a token from console.anthropic.com, paid per use.'
		}
	];
</script>

<article class="card" aria-labelledby="integration-claude">
	<header>
		<h2 id="integration-claude"><Icon name="claude" />AI (Claude)</h2>
		<Badge tone={status.tone}>{status.label}</Badge>
	</header>

	<p class="card-note">
		The app's AI features (Enrich, Auto Merge and sorting YouTube channels) use Claude. Choose how
		the app reaches it.
	</p>

	{#if saved === 'API' && claude.tokenEnvVar && !claude.tokenSet}
		<Alert tone="warn">
			<code>{claude.tokenEnvVar}</code> is not set. Add it to the server environment and restart the app.
		</Alert>
	{/if}

	<Form action="?/saveClaude" label="Claude" resetOnSuccess={false}>
		<RadioGroup legend="How to run Claude" name="mode" options={MODES} bind:value={mode} />

		{#if mode === 'LOCAL'}
			<section class="card-note" aria-label="What running locally means">
				<p>What running locally means:</p>
				<ul>
					<li>
						It only works while the app runs on this computer, with Claude Code installed and signed
						in. A copy hosted on a server needs an API token instead.
					</li>
					<li>
						Use counts against your Claude plan's limits, together with your own Claude Code and
						claude.ai use. A long Classify run can use up your allowance for a few hours.
					</li>
					<li>Each request starts Claude Code, so answers take a few seconds longer.</li>
					<li>
						Claude runs in an empty temporary folder with web search as its only tool. It cannot
						read or change your files, and it gets the same details as it would through the API.
					</li>
					<li>
						Anthropic allows this for your own use. Don't let other people use the app this way;
						give a shared copy an API token.
					</li>
				</ul>
			</section>
		{:else if mode === 'API'}
			<p class="card-note">
				Requests are billed to the API credits of the token's account; set a spend limit in the
				console. Works wherever the app runs. Put the token in an environment variable and enter the
				variable's name; the token itself is never stored.
			</p>
			<TextField
				label="Environment variable"
				name="tokenEnvVar"
				value={form?.values.tokenEnvVar ?? claude.tokenEnvVar ?? 'SOCIAL_SANITY_CLAUDE_TOKEN'}
				error={form?.error}
				autocomplete="off"
				required
			/>
		{/if}

		<footer>
			<Button type="submit" disabled={!mode}>Save</Button>
			{#if mode === 'LOCAL'}
				<Button
					type="submit"
					action="secondary"
					formaction="?/checkClaudeCode"
					busyLabel="Checking Claude Code…"
				>
					Check Claude Code
				</Button>
			{/if}
			{#if saved}
				<Button type="submit" action="secondary" formaction="?/removeClaude">Remove</Button>
			{/if}
		</footer>
		{#if mode === 'LOCAL' && check}
			<Alert tone={check.tone}>{check.message}</Alert>
		{/if}
	</Form>
</article>
