<script lang="ts" module>
	import { isEmptyEnrichment, type Enrichment } from '#lib/humans/enrich.ts';

	export type EnrichState = { enrichment: Enrichment } | { error: string } | null;
</script>

<script lang="ts">
	import type { MemberKind } from '#lib/groups/member.ts';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import DeleteButton from './DeleteButton.svelte';
	import EnrichmentReview from './EnrichmentReview.svelte';
	import Form from './Form.svelte';
	import KindPrompt from './KindPrompt.svelte';
	import NoNameFound from './NoNameFound.svelte';

	/** Looks one record up with AI on demand, whether or not it was looked up before. */
	let {
		kind,
		name,
		result,
		configured,
		enrichedAt
	}: {
		kind: MemberKind;
		/** The record's display name. */
		name: string;
		result: EnrichState;
		/** Whether AI is set up, through the API or Claude Code. */
		configured: boolean;
		/** When the AI last looked this record up, in epoch milliseconds; null when never. */
		enrichedAt: number | null;
	} = $props();

	const SEARCHES: Record<MemberKind, string> = {
		human:
			'the name of someone known only by an email address, social media accounts, content sources, public places and a publicly stated birthday, and proposes the country code of Google Contacts numbers that have none',
		company:
			'social media accounts, content sources, office addresses and public phone numbers, and proposes the country code of Google Contacts numbers that have none',
		channel: 'social media accounts and content sources'
	};

	let keptFor = $state<EnrichState>(null);
	const NOUN = { human: 'human', company: 'company', channel: 'channel' };

	const lastTime = $derived(
		enrichedAt === null
			? ''
			: new Date(enrichedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
	);
</script>

<section class="card" aria-labelledby="enrich">
	<header><h2 id="enrich">Enrich</h2></header>
	<p class="card-note">
		The AI searches the web for {SEARCHES[kind]}. It sends what the app knows about them to the AI.
		Nothing is added until you choose it.
	</p>
	<p class="card-note">
		{lastTime ? `Last enriched ${lastTime}.` : 'Not enriched yet.'}
	</p>

	{#if !configured}
		<Alert tone="info">Set up AI under Integrations to use this.</Alert>
	{:else}
		<Form action="?/enrich" label="Enrich with AI">
			<footer>
				<Button type="submit" action="secondary" busyLabel="Enriching… (up to a minute)">
					Enrich
				</Button>
			</footer>
		</Form>
	{/if}

	{#if result && 'error' in result}
		<Alert tone="danger">{result.error}</Alert>
	{:else if result && result.enrichment.kind && keptFor !== result}
		<KindPrompt {name} {kind} suggestion={result.enrichment.kind} action="?/convert">
			{#snippet keep()}
				<Button action="secondary" onclick={() => (keptFor = result)}>Keep as a {NOUN[kind]}</Button
				>
			{/snippet}
		</KindPrompt>
	{:else if result}
		{#if result.enrichment.notice}
			<Alert tone="info">{result.enrichment.notice}</Alert>
		{/if}
		{#if result.enrichment.emailOnly && !result.enrichment.name}
			<NoNameFound email={name} />
			<footer>
				<DeleteButton
					{name}
					label="Delete"
					consequence="Their details, content sources and group memberships are deleted too. Imports won't bring them back."
				/>
			</footer>
		{/if}
		{#if isEmptyEnrichment(result.enrichment)}
			<p>The AI found nothing new it is sure belongs here.</p>
		{:else}
			<EnrichmentReview enrichment={result.enrichment} />
		{/if}
	{/if}
</section>
