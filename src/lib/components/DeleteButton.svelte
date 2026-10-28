<script lang="ts">
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';

	/** A trash-can button, or a button with `label`, that asks before submitting `action`. */
	let {
		name,
		label,
		action = '?/delete',
		consequence,
		fields = {}
	}: {
		/** What is deleted, e.g. "Ada Lovelace". */
		name: string;
		/** Text for the button instead of the trash can, e.g. "Delete". */
		label?: string;
		action?: string;
		/** What deleting it means, shown in the confirmation. */
		consequence: string;
		/** Hidden values sent with the action, e.g. which record to delete. */
		fields?: Record<string, string>;
	} = $props();

	let open = $state(false);
</script>

{#if label}
	<Button action="secondary" onclick={() => (open = true)}>{label}</Button>
{:else}
	<Button action="icon" label="Delete {name}" onclick={() => (open = true)}
		><Icon name="trash" /></Button
	>
{/if}
<Dialog {open} title="Delete {name}?" onclose={() => (open = false)}>
	<p>{consequence}</p>
	<Form {action} label="Delete {name}" onsuccess={() => (open = false)}>
		{#each Object.entries(fields) as [field, value] (field)}
			<input type="hidden" name={field} {value} />
		{/each}
		<footer>
			<Button type="submit" action="destructive">Delete</Button>
			<Button action="secondary" onclick={() => (open = false)}>Cancel</Button>
		</footer>
	</Form>
</Dialog>
