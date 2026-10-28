<script lang="ts" module>
	import type { MemberKind } from '#lib/groups/member.ts';

	export type MergeFacts = { kind: MemberKind; id: number; name: string; facts: string[] };
	export type MergePair = {
		mergeCandidateId: number;
		reason: string;
		first: MergeFacts;
		second: MergeFacts;
	};
</script>

<script lang="ts">
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import CardGrid from './CardGrid.svelte';
	import Form from './Form.svelte';
	import MemberLink from './MemberLink.svelte';

	/**
	 * One pair the AI thinks is the same record, for the user to merge or tell apart, and a button
	 * to look for pairs. Nothing is merged without the user choosing which record to keep.
	 */
	let {
		kind,
		current,
		left,
		claudeConfigured
	}: { kind: MemberKind; current: MergePair | null; left: number; claudeConfigured: boolean } =
		$props();

	const PLURAL = { human: 'humans', company: 'companies', channel: 'channels' };
</script>

{#if current}
	<section aria-labelledby="merge-pair">
		<h2 id="merge-pair">Are these the same? ({left} to go)</h2>
		{#if current.reason}<p class="card-note">Why the AI thinks so: {current.reason}</p>{/if}
		<CardGrid>
			{#each [current.first, current.second] as member (member.id)}
				<article class="card" aria-label={member.name}>
					<header>
						<h3><MemberLink kind={member.kind} id={member.id} name={member.name} /></h3>
					</header>
					{#if member.facts.length}
						<ul>
							{#each member.facts as fact (fact)}<li>{fact}</li>{/each}
						</ul>
					{:else}
						<p class="card-note">Nothing else is known.</p>
					{/if}
					<Form action="?/merge" label="Merge into {member.name}">
						<input type="hidden" name="mergeCandidateId" value={current.mergeCandidateId} />
						<input type="hidden" name="keepId" value={member.id} />
						<footer>
							<Button type="submit" busyLabel="Merging…">Merge into this one</Button>
						</footer>
					</Form>
				</article>
			{/each}
		</CardGrid>
		<p class="card-note">
			Merging keeps the chosen name and adds everything the other one has; the other one is removed.
		</p>
		<Form action="?/dismiss" label="Not the same">
			<input type="hidden" name="mergeCandidateId" value={current.mergeCandidateId} />
			<footer>
				<Button type="submit" action="secondary">Not the same</Button>
			</footer>
		</Form>
	</section>
{:else if !claudeConfigured}
	<Alert tone="info">Set up AI under Integrations to look for duplicates.</Alert>
{:else}
	<p>
		The AI reads the names and social media profiles of all your {PLURAL[kind]} and suggests the ones
		that look like the same {kind}. You then decide on each pair; nothing is merged without you.
	</p>
	<Form action="?/find" label="Find duplicates">
		<footer>
			<Button type="submit" busyLabel="The AI is looking… (up to a few minutes)"
				>Find duplicates with AI</Button
			>
		</footer>
	</Form>
{/if}
