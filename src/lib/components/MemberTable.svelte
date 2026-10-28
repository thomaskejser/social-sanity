<script lang="ts" module>
	import type { PresenceAccount } from '#lib/members/presence.ts';

	export type MemberRow = {
		id: number;
		name: string;
		kudos: number;
		fromGoogle?: boolean;
		fromYouTube?: boolean;
		groupIds: number[];
		avatar?: boolean;
		accounts?: PresenceAccount[];
	};
</script>

<script lang="ts">
	import type { MemberKind } from '#lib/groups/member.ts';
	import { setDraggedMember } from '#lib/groups/member.ts';
	import type { Page } from '#lib/pagination.ts';
	import Badge from './Badge.svelte';
	import IntegrationLogo from './IntegrationLogo.svelte';
	import KudosBar from './KudosBar.svelte';
	import MemberLink from './MemberLink.svelte';
	import PaginatedTable from './PaginatedTable.svelte';
	import PresenceIcons from './PresenceIcons.svelte';

	/** Humans, companies or channels found by a search, draggable onto groups. */
	let {
		kind,
		rows,
		pages,
		href,
		groupNames
	}: {
		kind: MemberKind;
		rows: MemberRow[];
		pages: Page;
		href: (n: number) => string;
		groupNames: Map<number, string>;
	} = $props();

	const NAMES = {
		human: { caption: 'Humans', column: 'Human', idField: 'humanId' },
		company: { caption: 'Companies', column: 'Company', idField: 'companyId' },
		channel: { caption: 'Channels', column: 'Channel', idField: 'channelId' }
	};
	const { caption, column, idField } = $derived(NAMES[kind]);

	function ondragstart(event: DragEvent, row: MemberRow) {
		setDraggedMember(event.dataTransfer, { kind, id: row.id, name: row.name });
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyLink';
	}
</script>

<PaginatedTable {caption} columns={[column, 'Groups', 'Kudos']} {rows} {pages} {href}>
	{#snippet row(row)}
		<td>
			<!-- Dragging onto a group is a mouse shortcut; each page sets groups by keyboard too. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span class="member-name" draggable="true" ondragstart={(event) => ondragstart(event, row)}>
				<MemberLink {kind} id={row.id} name={row.name} avatar={row.avatar} />
				{#if row.fromGoogle}
					<IntegrationLogo logo={{ product: 'google-contacts' }} label="From Google Contacts" />
				{/if}
				{#if row.fromYouTube}
					<IntegrationLogo logo={{ brand: 'youtube' }} label="From YouTube" />
				{/if}
				<PresenceIcons accounts={row.accounts} />
			</span>
		</td>
		<td>
			{#each row.groupIds as groupId (groupId)}
				<Badge>{groupNames.get(groupId)}</Badge>
			{/each}
		</td>
		<td>
			<KudosBar
				kudos={row.kudos}
				action="?/kudos"
				label={row.name}
				fields={{ [idField]: row.id }}
			/>
		</td>
	{/snippet}
	{#snippet empty()}Nothing matches.{/snippet}
</PaginatedTable>
