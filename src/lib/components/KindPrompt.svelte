<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MemberKind } from '#lib/groups/member.ts';
	import type { KindSuggestion } from '#lib/humans/enrich.ts';
	import Alert from './Alert.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Form from './Form.svelte';

	/**
	 * Asks whether to move a record the AI thinks is another kind. Moving posts `to` and `fields` to
	 * `action`; `keep` holds the button that carries on with the record as it is.
	 */
	let {
		name,
		kind,
		suggestion,
		action,
		fields = {},
		keep
	}: {
		name: string;
		kind: MemberKind;
		suggestion: KindSuggestion;
		action: string;
		fields?: Record<string, string | number>;
		keep: Snippet;
	} = $props();

	const NOUN = { human: 'a human', company: 'a company', channel: 'a channel' };
	const TONES = { high: 'ok', medium: 'info', low: 'neutral' } as const;
</script>

<Alert tone="warn">
	The AI thinks {name} is {NOUN[suggestion.kind]}, not {NOUN[kind]}.
	<Badge tone={TONES[suggestion.confidence]}>{suggestion.confidence}</Badge>
	{#if suggestion.reason}{suggestion.reason}{/if}
</Alert>
<p class="card-note">
	Moving it keeps: {suggestion.keep.join('; ')}.
	{#if suggestion.strip.length}It drops: {suggestion.strip.join('; ')}.{/if}
</p>
<Form {action} label="Make {name} {NOUN[suggestion.kind]}">
	{#each Object.entries(fields) as [field, value] (field)}
		<input type="hidden" name={field} {value} />
	{/each}
	<input type="hidden" name="to" value={suggestion.kind} />
	<footer>
		<Button type="submit" busyLabel="Moving…">Make it {NOUN[suggestion.kind]}</Button>
		{@render keep()}
	</footer>
</Form>
