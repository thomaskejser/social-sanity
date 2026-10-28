<script lang="ts" module>
	import type { Enrichment } from '#lib/humans/enrich.ts';

	export type EnrichCandidate = { id: number; name: string; missing: string[]; remaining: number };
	export type LookupResult =
		{ id: number; name: string; enrichment: Enrichment } | { error: string } | null;
</script>

<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { MemberKind } from '#lib/groups/member.ts';
	import { isEmptyEnrichment } from '#lib/humans/enrich.ts';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import ConvertedNotice from './ConvertedNotice.svelte';
	import DeleteButton from './DeleteButton.svelte';
	import DropForm from './DropForm.svelte';
	import EnrichmentReview from './EnrichmentReview.svelte';
	import Form from './Form.svelte';
	import KindPrompt from './KindPrompt.svelte';
	import LinkButton from './LinkButton.svelte';
	import NoNameFound from './NoNameFound.svelte';

	/**
	 * Walks records one at a time: looks the current one up with AI, then shows in the same card
	 * what was found to save, that nothing was found, or the error. With `auto` the lookup starts
	 * as soon as the page shows. The lookup marks the record, so the page's next candidate moves
	 * on; the card keeps showing the record the result belongs to. When the AI thinks the record is
	 * another kind, the card asks whether to move it before showing what was found.
	 */
	let {
		kind,
		noun,
		candidate,
		auto,
		result,
		converted,
		pagePath,
		stopHref
	}: {
		kind: MemberKind;
		/** What the records are, in the plural, e.g. "humans". */
		noun: string;
		/** The next record to look up; null when none is left. */
		candidate: EnrichCandidate | null;
		auto: boolean;
		result: LookupResult;
		/** The record the last move made, to say so; null when there was none. */
		converted: { kind: MemberKind; id: number; name: string } | null;
		/** This page; the next record is `pagePath?after=<id>&auto`. */
		pagePath: ResolvedPathname;
		stopHref: ResolvedPathname;
	} = $props();

	let lookupForm: DropForm;
	let searching = $state(false);
	const found = $derived(result && 'enrichment' in result ? result : null);
	const failed = $derived(result && 'error' in result ? result.error : '');
	const noName = $derived(!!found?.enrichment.emailOnly && !found.enrichment.name);
	const current = $derived(found ? { id: found.id, name: found.name } : candidate);
	let keptKindOf = $state<number | null>(null);
	const askKind = $derived(!!found?.enrichment.kind && keptKindOf !== found.id);
	const NOUN = { human: 'human', company: 'company', channel: 'channel' };
	const nextHref = $derived(current ? `${pagePath}?after=${current.id}&auto` : pagePath);

	async function lookup() {
		searching = true;
		if (candidate) await lookupForm.submit({ memberId: String(candidate.id) });
	}

	$effect(() => {
		if (result) searching = false;
	});

	$effect(() => {
		if (auto && candidate && !result && !searching) lookup();
	});

	function next() {
		window.location.assign(nextHref);
	}
</script>

{#snippet deleteButton()}
	{#if found && noName}
		<DeleteButton
			name={found.name}
			label="Delete"
			fields={{ memberId: String(found.id) }}
			consequence="Their details, content sources and group memberships are deleted too. Imports won't bring them back."
		/>
	{/if}
{/snippet}

{#if converted}
	<ConvertedNotice {converted} />
{/if}

<section class="card" aria-labelledby="enrich-current" aria-live="polite">
	<header><h2 id="enrich-current">{current?.name ?? 'Enrich'}</h2></header>
	{#if found && found.enrichment.kind && askKind}
		<KindPrompt
			name={found.name}
			{kind}
			suggestion={found.enrichment.kind}
			action="?/convert"
			fields={{ memberId: found.id }}
		>
			{#snippet keep()}
				<Button action="secondary" onclick={() => (keptKindOf = found.id)}>
					Keep as a {NOUN[kind]}
				</Button>
				<LinkButton href={stopHref} action="secondary">Stop</LinkButton>
			{/snippet}
		</KindPrompt>
	{:else if found}
		{#if found.enrichment.notice}
			<Alert tone="info">{found.enrichment.notice}</Alert>
		{/if}
		{#if noName}
			<NoNameFound email={found.name} />
		{/if}
		{#if isEmptyEnrichment(found.enrichment)}
			<p>Nothing new found for {found.name}.</p>
			<footer>
				<Button onclick={next}>Next</Button>
				{@render deleteButton()}
				<LinkButton href={stopHref} action="secondary">Stop</LinkButton>
			</footer>
		{:else}
			<p class="card-note">New information is highlighted; tick what to save.</p>
			<EnrichmentReview
				enrichment={found.enrichment}
				action="?/apply"
				submitLabel="Save and next"
				fields={{ memberId: found.id }}
			>
				{#snippet footer()}
					<Button action="secondary" onclick={next}>Next without saving</Button>
					{@render deleteButton()}
					<LinkButton href={stopHref} action="secondary">Stop</LinkButton>
				{/snippet}
			</EnrichmentReview>
		{/if}
	{:else if !candidate}
		<Alert tone="danger">{failed}</Alert>
		<footer>
			<LinkButton href={stopHref} action="secondary">Stop</LinkButton>
		</footer>
	{:else}
		<p>
			Missing: {candidate.missing.join(', ')}. {candidate.remaining.toLocaleString()}
			{noun} to go, including this one.
		</p>
		{#if failed}
			<Alert tone="danger">{failed}</Alert>
		{/if}
		<footer>
			<Button
				onclick={lookup}
				busy={searching}
				busyLabel="AI is looking up {candidate.name}… (up to a minute)"
			>
				Look up {candidate.name}
			</Button>
			<Button action="secondary" onclick={next}>Skip</Button>
			<Form action="?/auto" label="Enrich every one of the {noun} automatically">
				<Button type="submit" action="secondary" busyLabel="Starting…">Auto</Button>
			</Form>
			<LinkButton href={stopHref} action="secondary">Stop</LinkButton>
		</footer>
	{/if}
	<DropForm bind:this={lookupForm} action="?/lookup" />
</section>
