<script lang="ts" module>
	import type { Member, MemberKind } from '#lib/groups/member.ts';

	export type GroupView = {
		humanGroupId: number;
		humanGroup: string;
		members: Member[];
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		draggedMember,
		isMemberDrag,
		MEMBER_KINDS,
		setDraggedMember
	} from '#lib/groups/member.ts';
	import Button from './Button.svelte';
	import DeleteButton from './DeleteButton.svelte';
	import Dialog from './Dialog.svelte';
	import DropForm from './DropForm.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';
	import MemberLink from './MemberLink.svelte';
	import MergeGroupButton from './MergeGroupButton.svelte';
	import PresenceIcons from './PresenceIcons.svelte';
	import Pagination from './Pagination.svelte';
	import RenameButton from './RenameButton.svelte';
	import type { Page } from '#lib/pagination.ts';
	import TextField from './TextField.svelte';

	/** A drop or click that needs the user to confirm or choose, shown in the dialog. */
	type Pending =
		| { kind: 'move'; member: Member; from: GroupView; to: GroupView }
		| { kind: 'ungroup'; member: Member; from: GroupView }
		| { kind: 'delete'; group: GroupView }
		| { kind: 'convert'; member: Member; to: MemberKind; keep: string[]; strip: string[] };

	let {
		groups,
		ungrouped,
		ungroupedHref,
		page,
		error
	}: {
		groups: GroupView[];
		/** One page of this page's kind that are in no group. */
		ungrouped: { pages: Page; open: boolean; members: Member[] };
		/** Link to page `n` of the no-group list. */
		ungroupedHref: (n: number) => string;
		/** What the page lists; the other kinds are offered as "Make …" drop targets. */
		page: MemberKind;
		error?: string;
	} = $props();

	const NO_GROUP = -1;
	/** Drop targets that turn a member into another kind. */
	const MAKE = { human: -2, company: -3, channel: -4 } as const;
	const NOUN = {
		human: ['human', 'humans'],
		company: ['company', 'companies'],
		channel: ['channel', 'channels']
	} as const;
	const makeKinds = $derived(MEMBER_KINDS.filter((kind) => kind !== page));

	let forms: Record<'addMember' | 'removeMember' | 'ungroup' | 'deleteGroup', DropForm> = $state({
		addMember: undefined!,
		removeMember: undefined!,
		ungroup: undefined!,
		deleteGroup: undefined!
	});
	let dropTarget = $state<number | null>(null);
	/**
	 * Which sections are open. Kept here rather than read from the data, so a form action that
	 * refreshes the data updates the rows without closing what the user opened.
	 */
	let noGroupOpen = $state(untrack(() => ungrouped.open));
	let openGroups = $state<Record<number, boolean>>({});
	let pending = $state<Pending | null>(null);
	/** The group a member is being dragged out of; null for drags from search results. */
	let draggedFrom: GroupView | null = null;

	function memberFields(member: Member) {
		return { kind: member.kind, memberId: String(member.id) };
	}

	function plural(kind: MemberKind, n: number): string {
		return `${n.toLocaleString()} ${NOUN[kind][n === 1 ? 0 : 1]}`;
	}

	function describeMembers(group: GroupView): string {
		const parts = MEMBER_KINDS.map((kind) => {
			const n = group.members.filter((m) => m.kind === kind).length;
			return n && plural(kind, n);
		});
		return parts.filter(Boolean).join(' and ') || 'nobody';
	}

	/**
	 * The Humans page shows every member of a group; the Companies and Channels pages show only
	 * their own kind, and the others stay in the group, unshown.
	 */
	function shown(group: GroupView): Member[] {
		return page === 'human' ? group.members : group.members.filter((m) => m.kind === page);
	}

	function groupsOf(member: Member): number {
		return groups.filter((g) => g.members.some((m) => m.kind === member.kind && m.id === member.id))
			.length;
	}

	function ondragstart(event: DragEvent, from: GroupView | null, member: Member) {
		draggedFrom = from;
		setDraggedMember(event.dataTransfer, member);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove';
	}

	function ondragover(event: DragEvent, target: number) {
		if (!isMemberDrag(event.dataTransfer)) return;
		event.preventDefault();
		dropTarget = target;
	}

	function dropOnGroup(member: Member, from: GroupView | null, to: GroupView) {
		if (!from) {
			forms.addMember.submit({ ...memberFields(member), humanGroupId: String(to.humanGroupId) });
			return;
		}
		if (from.humanGroupId !== to.humanGroupId) pending = { kind: 'move', member, from, to };
	}

	function dropOnNoGroup(member: Member, from: GroupView | null) {
		if (!from) {
			forms.ungroup.submit(memberFields(member));
			return;
		}
		if (groupsOf(member) > 1) {
			pending = { kind: 'ungroup', member, from };
			return;
		}
		forms.removeMember.submit({ ...memberFields(member), humanGroupId: String(from.humanGroupId) });
	}

	async function dropOnMake(member: Member, to: MemberKind) {
		if (member.kind === to) return;
		const params = new URLSearchParams({ kind: member.kind, id: String(member.id), to });
		const response = await fetch(`${resolve('/members/convert-preview')}?${params}`);
		if (!response.ok) throw new Error(`Could not preview turning ${member.name} into a ${to}.`);
		const preview = (await response.json()) as { keep: string[]; strip: string[] };
		pending = { kind: 'convert', member, to, ...preview };
	}

	function ondrop(event: DragEvent, target: GroupView | typeof NO_GROUP | MemberKind) {
		dropTarget = null;
		const from = draggedFrom;
		draggedFrom = null;
		const member = draggedMember(event.dataTransfer);
		if (!member) return;
		event.preventDefault();
		if (target === NO_GROUP) dropOnNoGroup(member, from);
		else if (typeof target === 'string') dropOnMake(member, target);
		else dropOnGroup(member, from, target);
	}

	/** Deletes an empty group at once; asks first when it has members. */
	function deleteGroup(group: GroupView) {
		if (group.members.length) pending = { kind: 'delete', group };
		else forms.deleteGroup.submit({ humanGroupId: String(group.humanGroupId) });
	}

	function close() {
		pending = null;
	}
</script>

<section class="group-list" aria-labelledby="groups">
	<h2 id="groups">Groups</h2>
	<p class="card-note">
		Drag a {NOUN[page][0]} onto a group to add them, from one group to another, or onto "No group" to
		take them out.
	</p>
	<ul class="groups">
		{#each groups as group (group.humanGroupId)}
			<li
				data-dropping={dropTarget === group.humanGroupId || undefined}
				ondragover={(event) => ondragover(event, group.humanGroupId)}
				ondragleave={() => (dropTarget = null)}
				ondrop={(event) => ondrop(event, group)}
			>
				<details
					open={openGroups[group.humanGroupId] ?? false}
					ontoggle={(event) => (openGroups[group.humanGroupId] = event.currentTarget.open)}
				>
					<summary>{group.humanGroup} ({shown(group).length})</summary>
					<ul>
						{#each shown(group) as member (`${member.kind}-${member.id}`)}
							<li
								draggable="true"
								ondragstart={(event) => ondragstart(event, group, member)}
								ondragend={() => (draggedFrom = null)}
							>
								<MemberLink
									kind={member.kind}
									id={member.id}
									name={member.name}
									avatar={member.avatar}
								/>
								<PresenceIcons accounts={member.accounts} />
								<RenameButton
									name={member.name}
									action="?/renameMember"
									field="name"
									fields={memberFields(member)}
								/>
							</li>
						{:else}
							<li>Nobody yet.</li>
						{/each}
					</ul>
				</details>
				{#if groups.length > 1}
					<MergeGroupButton
						{group}
						others={groups.filter((g) => g.humanGroupId !== group.humanGroupId)}
					/>
				{/if}
				<RenameButton
					name={group.humanGroup}
					action="?/renameGroup"
					field="humanGroup"
					fields={{ humanGroupId: String(group.humanGroupId) }}
				/>
				<Button
					action="icon"
					label="Delete group {group.humanGroup}"
					onclick={() => deleteGroup(group)}><Icon name="trash" /></Button
				>
			</li>
		{/each}
		<li
			class="virtual-group"
			data-dropping={dropTarget === NO_GROUP || undefined}
			ondragover={(event) => ondragover(event, NO_GROUP)}
			ondragleave={() => (dropTarget = null)}
			ondrop={(event) => ondrop(event, NO_GROUP)}
		>
			<details bind:open={noGroupOpen}>
				<summary>No group ({plural(page, ungrouped.pages.total)})</summary>
				<ul>
					{#each ungrouped.members as member (member.id)}
						<li
							draggable="true"
							ondragstart={(event) => ondragstart(event, null, member)}
							ondragend={() => (draggedFrom = null)}
						>
							<MemberLink
								kind={member.kind}
								id={member.id}
								name={member.name}
								avatar={member.avatar}
							/>
							<PresenceIcons accounts={member.accounts} />
							<RenameButton
								name={member.name}
								action="?/renameMember"
								field="name"
								fields={memberFields(member)}
							/>
							<DeleteButton
								name={member.name}
								action="?/deleteMember"
								fields={memberFields(member)}
								consequence="{member.name} and everything the app knows about them is deleted. The app remembers where they were imported from, so Google Contacts and YouTube imports won't add them again."
							/>
						</li>
					{:else}
						<li>Everyone is in a group.</li>
					{/each}
				</ul>
				<Pagination
					page={ungrouped.pages.page}
					pageCount={ungrouped.pages.pageCount}
					href={ungroupedHref}
				/>
			</details>
		</li>
		{#each makeKinds as kind (kind)}
			<li
				class="virtual-group"
				data-dropping={dropTarget === MAKE[kind] || undefined}
				ondragover={(event) => ondragover(event, MAKE[kind])}
				ondragleave={() => (dropTarget = null)}
				ondrop={(event) => ondrop(event, kind)}
			>
				<p><Icon name={kind} />Make {NOUN[kind][0]}</p>
			</li>
		{/each}
	</ul>
	<Form action="?/createGroup" label="Create a group" variant="inline">
		<TextField label="New group" name="humanGroup" {error} required />
		<footer><Button type="submit" action="secondary">Create group</Button></footer>
	</Form>
	<DropForm bind:this={forms.addMember} action="?/addMember" />
	<DropForm bind:this={forms.removeMember} action="?/removeMember" />
	<DropForm bind:this={forms.ungroup} action="?/ungroup" />
	<DropForm bind:this={forms.deleteGroup} action="?/deleteGroup" />
	<Dialog
		open={pending !== null}
		title={pending?.kind === 'move'
			? `Move or copy ${pending.member.name}?`
			: pending?.kind === 'ungroup'
				? `Take ${pending.member.name} out of which groups?`
				: pending?.kind === 'delete'
					? `Delete the group ${pending.group.humanGroup}?`
					: pending?.kind === 'convert'
						? `Turn ${pending.member.name} into a ${pending.to}?`
						: ''}
		onclose={close}
	>
		{#if pending?.kind === 'move'}
			<p>
				Move {pending.member.name} from {pending.from.humanGroup} to {pending.to.humanGroup}, or
				copy them so they are in both groups?
			</p>
			<Form action="?/moveMember" label="Move or copy" onsuccess={close}>
				<input type="hidden" name="kind" value={pending.member.kind} />
				<input type="hidden" name="memberId" value={pending.member.id} />
				<input type="hidden" name="fromGroupId" value={pending.from.humanGroupId} />
				<input type="hidden" name="humanGroupId" value={pending.to.humanGroupId} />
				<footer>
					<Button type="submit">Move</Button>
					<Button type="submit" action="secondary" formaction="?/addMember">Copy</Button>
					<Button action="secondary" onclick={close}>Cancel</Button>
				</footer>
			</Form>
		{:else if pending?.kind === 'ungroup'}
			<p>{pending.member.name} is in more than one group.</p>
			<Form action="?/removeMember" label="Take out of groups" onsuccess={close}>
				<input type="hidden" name="kind" value={pending.member.kind} />
				<input type="hidden" name="memberId" value={pending.member.id} />
				<input type="hidden" name="humanGroupId" value={pending.from.humanGroupId} />
				<footer>
					<Button type="submit">Only {pending.from.humanGroup}</Button>
					<Button type="submit" action="destructive" formaction="?/ungroup">All groups</Button>
					<Button action="secondary" onclick={close}>Cancel</Button>
				</footer>
			</Form>
		{:else if pending?.kind === 'delete'}
			<p>
				The {describeMembers(pending.group)} in it will not be deleted; they just stop being in this group.
			</p>
			<Form action="?/deleteGroup" label="Delete group" onsuccess={close}>
				<input type="hidden" name="humanGroupId" value={pending.group.humanGroupId} />
				<footer>
					<Button type="submit" action="destructive">Delete group</Button>
					<Button action="secondary" onclick={close}>Cancel</Button>
				</footer>
			</Form>
		{:else if pending?.kind === 'convert'}
			<p>Kept:</p>
			<ul>
				{#each pending.keep as item (item)}<li>{item}</li>{/each}
			</ul>
			{#if pending.strip.length}
				<p><strong>Removed, because {NOUN[pending.to][1]} do not hold them:</strong></p>
				<ul>
					{#each pending.strip as item (item)}<li>{item}</li>{/each}
				</ul>
			{:else}
				<p>Nothing is removed.</p>
			{/if}
			<Form action="?/convert" label="Turn into a {pending.to}" onsuccess={close}>
				<input type="hidden" name="kind" value={pending.member.kind} />
				<input type="hidden" name="memberId" value={pending.member.id} />
				<input type="hidden" name="to" value={pending.to} />
				<footer>
					<Button
						type="submit"
						action={pending.strip.length ? 'destructive' : 'primary'}
						busyLabel="Converting…">Make {NOUN[pending.to][0]}</Button
					>
					<Button action="secondary" onclick={close}>Cancel</Button>
				</footer>
			</Form>
		{/if}
	</Dialog>
</section>
