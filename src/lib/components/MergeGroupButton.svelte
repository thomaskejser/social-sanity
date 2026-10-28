<script lang="ts">
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';
	import SelectField from './SelectField.svelte';

	/** A button that asks which group to merge this one into, then submits `?/mergeGroup`. */
	let {
		group,
		others
	}: {
		group: { humanGroupId: number; humanGroup: string };
		/** The groups it can be merged into. */
		others: { humanGroupId: number; humanGroup: string }[];
	} = $props();

	let open = $state(false);
	const options = $derived(
		others.map((g) => ({ value: String(g.humanGroupId), label: g.humanGroup }))
	);
</script>

<Button
	action="icon"
	label="Merge {group.humanGroup} into another group"
	onclick={() => (open = true)}><Icon name="merge" /></Button
>
<Dialog {open} title="Merge {group.humanGroup}" onclose={() => (open = false)}>
	<p>
		Everyone in {group.humanGroup} moves to the group you choose, and {group.humanGroup} is deleted.
	</p>
	<Form
		action="?/mergeGroup"
		label="Merge {group.humanGroup}"
		onsuccess={() => (open = false)}
		onfailure={() => (open = false)}
	>
		<input type="hidden" name="humanGroupId" value={group.humanGroupId} />
		<SelectField label="Merge into" name="intoGroupId" {options} value={options[0]?.value} />
		<footer>
			<Button type="submit" busyLabel="Merging…">Merge</Button>
			<Button action="secondary" onclick={() => (open = false)}>Cancel</Button>
		</footer>
	</Form>
</Dialog>
