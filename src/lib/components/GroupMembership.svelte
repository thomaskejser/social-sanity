<script lang="ts" module>
	export type GroupMembershipView = { humanGroupId: number; humanGroup: string; member: boolean };
</script>

<script lang="ts">
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import SelectField from './SelectField.svelte';

	let { groups }: { groups: GroupMembershipView[] } = $props();

	const memberOf = $derived(groups.filter((g) => g.member));
	const others = $derived(groups.filter((g) => !g.member));
</script>

<section class="card" aria-labelledby="group-membership">
	<header><h2 id="group-membership">Groups</h2></header>
	<ul class="detail-list">
		{#each memberOf as group (group.humanGroupId)}
			<li>
				{group.humanGroup}
				<Form action="?/removeFromGroup" label="Remove from {group.humanGroup}">
					<input type="hidden" name="humanGroupId" value={group.humanGroupId} />
					<Button type="submit" action="inline">Remove</Button>
				</Form>
			</li>
		{:else}
			<li>Not in any group.</li>
		{/each}
	</ul>
	{#if others.length}
		<Form action="?/addToGroup" label="Add to group" variant="detail">
			<SelectField
				label="Add to group"
				name="humanGroupId"
				options={others.map((g) => ({ value: String(g.humanGroupId), label: g.humanGroup }))}
				value={String(others[0].humanGroupId)}
			/>
			<footer><Button type="submit" action="secondary">Add</Button></footer>
		</Form>
	{:else if !groups.length}
		<p class="card-note">No groups yet. Create them on the Humans page.</p>
	{/if}
</section>
