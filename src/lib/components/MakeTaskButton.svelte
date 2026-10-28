<script lang="ts">
	import { QUADRANTS } from '#lib/tasks/task.ts';
	import Button from './Button.svelte';
	import DateField from './DateField.svelte';
	import Dialog from './Dialog.svelte';
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';
	import RadioGroup from './RadioGroup.svelte';
	import TextArea from './TextArea.svelte';
	import TextField from './TextField.svelte';

	/**
	 * A button with the task icon that turns something into a task: it asks how important and
	 * urgent it is, then posts `task`, `description`, `quadrant` (`urgent:important`, each `true`
	 * or `false`), `dueDate` and `fields` to `action`.
	 */
	let {
		task,
		description = '',
		action = '?/toTask',
		fields = {},
		variant = 'inline'
	}: {
		/** The task's starting name, e.g. "Read: How to garden". */
		task: string;
		description?: string;
		action?: string;
		fields?: Record<string, string | number>;
		variant?: 'inline' | 'secondary';
	} = $props();

	let open = $state(false);
	let quadrant = $state('');
	const QUADRANT_OPTIONS = QUADRANTS.map((q) => ({
		value: `${q.urgent}:${q.important}`,
		label: q.title,
		description: q.hint
	}));

	function close() {
		open = false;
		quadrant = '';
	}
</script>

<Button action={variant} onclick={() => (open = true)}><Icon name="tasks" />Make a task</Button>
<Dialog {open} title="Make a task" onclose={close}>
	{#if open}
		<Form {action} label="Make a task" onsuccess={close}>
			{#each Object.entries(fields) as [field, value] (field)}
				<input type="hidden" name={field} {value} />
			{/each}
			<TextField label="Task" name="task" value={task} required />
			<TextArea label="Description" name="description" value={description} rows={3} />
			<RadioGroup
				legend="How important and urgent is it?"
				name="quadrant"
				options={QUADRANT_OPTIONS}
				bind:value={quadrant}
			/>
			<DateField label="Due date" name="dueDate" hint="When it must be done. Optional." />
			<footer>
				<Button type="submit" disabled={!quadrant} busyLabel="Adding…">Add to tasks</Button>
				<Button action="secondary" onclick={close}>Cancel</Button>
			</footer>
		</Form>
	{/if}
</Dialog>
