<script lang="ts">
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';
	import TextField from './TextField.svelte';

	/** A pencil button that asks for a new name and submits it to `action` as `field`. */
	let {
		name,
		action,
		field,
		fields = {}
	}: {
		/** The current name. */
		name: string;
		action: string;
		/** The form field holding the new name. */
		field: string;
		/** Hidden values sent with the action, e.g. which record to rename. */
		fields?: Record<string, string>;
	} = $props();

	let open = $state(false);
</script>

<Button action="icon" label="Rename {name}" onclick={() => (open = true)}
	><Icon name="rename" /></Button
>
<Dialog {open} title="Rename {name}" onclose={() => (open = false)}>
	<Form
		{action}
		label="Rename {name}"
		onsuccess={() => (open = false)}
		onfailure={() => (open = false)}
	>
		{#each Object.entries(fields) as [key, value] (key)}
			<input type="hidden" name={key} {value} />
		{/each}
		<TextField label="New name" name={field} value={name} autocomplete="off" required />
		<footer>
			<Button type="submit" busyLabel="Renaming…">Rename</Button>
			<Button action="secondary" onclick={() => (open = false)}>Cancel</Button>
		</footer>
	</Form>
</Dialog>
