<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { MemberKind } from '#lib/groups/member.ts';
	import type { Enrichment } from '#lib/humans/enrich.ts';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import KindPrompt from './KindPrompt.svelte';
	import LinkButton from './LinkButton.svelte';
	import MemberLink from './MemberLink.svelte';

	/**
	 * What the automatic Enrich run has saved, newest first, with a Stop button that ends the run
	 * and goes back to the one-at-a-time walk.
	 */
	let {
		kind,
		noun,
		running,
		current,
		entries,
		looked,
		saved,
		error,
		paused,
		remaining,
		walkHref
	}: {
		kind: MemberKind;
		/** What the records are, in the plural, e.g. "humans". */
		noun: string;
		running: boolean;
		current: { id: number; name: string } | null;
		/** The last few looked up, newest first. */
		entries: { id: number; name: string; added: string[]; error: string }[];
		looked: number;
		saved: number;
		error: string | null;
		/** The record the run waits on, because the AI thinks it is another kind; null when none. */
		paused: { id: number; name: string; enrichment: Enrichment } | null;
		remaining: number;
		/** The one-at-a-time Enrich page. */
		walkHref: ResolvedPathname;
	} = $props();

	const NOUN = { human: 'human', company: 'company', channel: 'channel' };
</script>

<section class="card" aria-labelledby="auto-enrich" aria-live="polite">
	<header>
		<h2 id="auto-enrich">
			{running ? 'Enriching automatically' : paused ? 'Auto is waiting for you' : 'Auto finished'}
		</h2>
	</header>
	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}
	{#if paused?.enrichment.kind}
		<KindPrompt
			name={paused.name}
			{kind}
			suggestion={paused.enrichment.kind}
			action="?/convert"
			fields={{ memberId: paused.id }}
		>
			{#snippet keep()}
				<Button type="submit" action="secondary" formaction="?/keep" busyLabel="Carrying on…">
					Keep as a {NOUN[kind]} and carry on
				</Button>
			{/snippet}
		</KindPrompt>
	{:else if running && current}
		<p aria-busy="true">
			The AI is looking up {current.name}… {remaining.toLocaleString()}
			{noun} to go, including this one. Looked up {looked.toLocaleString()} so far.
		</p>
	{:else if !running}
		<p>
			Looked up {looked.toLocaleString()}
			{noun}, and saved what the AI was highly confident about for {saved.toLocaleString()} of them.
			{remaining.toLocaleString()}
			{noun} left to look up.
		</p>
	{/if}
	{#if entries.length}
		<ol>
			{#each entries as entry (entry.id)}
				<li>
					<MemberLink {kind} id={entry.id} name={entry.name} />
					{#if entry.error}
						<Alert tone="danger">{entry.error}</Alert>
					{:else if entry.added.length}
						<ul>
							{#each entry.added as line (line)}
								<li>{line}</li>
							{/each}
						</ul>
					{:else}
						<p class="card-note">Nothing confident found.</p>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
	<footer>
		{#if running || paused}
			<Form action="?/stop" label="Stop enriching automatically">
				<Button type="submit" busyLabel="Stopping…">Stop</Button>
			</Form>
		{:else}
			<LinkButton href={walkHref}>Back to Enrich</LinkButton>
		{/if}
	</footer>
</section>
