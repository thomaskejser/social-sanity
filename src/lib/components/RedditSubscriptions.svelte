<script lang="ts">
	import type { MemberKind } from '#lib/groups/member.ts';
	import type { Page } from '#lib/pagination.ts';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import MemberLink from './MemberLink.svelte';
	import PaginatedTable from './PaginatedTable.svelte';

	/** The subreddits and people followed on Reddit, as the records they became in the app. */
	let {
		imported,
		pages,
		href,
		connected,
		message
	}: {
		imported: { kind: MemberKind; id: number; name: string }[];
		pages: Page;
		href: (n: number) => string;
		connected: boolean;
		message: { tone: 'ok' | 'danger'; message: string } | null;
	} = $props();
</script>

<section aria-labelledby="subscriptions">
	<h2 id="subscriptions">Subreddits and people you follow</h2>
	<p class="card-note">
		Imported every hour. Each subreddit becomes a channel named r/name, and each person a human
		named u/name, with their Reddit page as a content source, so their posts show up in Consume.
		Change or delete them like any other record; imports leave them alone and never bring a deleted
		one back.
	</p>
	{#if message}
		<Alert tone={message.tone}>{message.message}</Alert>
	{/if}
	{#if !connected}
		<Alert tone="info">Connect Reddit above first.</Alert>
	{:else}
		<Form action="?/importSubscriptions" label="Import from Reddit">
			<footer>
				<Button type="submit" action="secondary" busyLabel="Importing from Reddit…">
					Import now
				</Button>
			</footer>
		</Form>
	{/if}
	{#if pages.total}
		<PaginatedTable caption="In the app" columns={['Record']} rows={imported} {pages} {href}>
			{#snippet row(member)}
				<td><MemberLink kind={member.kind} id={member.id} name={member.name} avatar /></td>
			{/snippet}
			{#snippet empty()}Nothing imported yet.{/snippet}
		</PaginatedTable>
	{/if}
</section>
