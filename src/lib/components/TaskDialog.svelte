<script lang="ts" module>
	import type { Task } from '#lib/tasks/task.ts';

	/** A task being edited, or a new task with its starting quadrant. */
	export type TaskDraft = Task | { taskId: null; urgent: boolean; important: boolean };
	export type TaskFormErrors = Partial<Record<'task' | 'dueDate', string>>;
</script>

<script lang="ts">
	import Button from './Button.svelte';
	import Checkbox from './Checkbox.svelte';
	import DateField from './DateField.svelte';
	import Dialog from './Dialog.svelte';
	import Form from './Form.svelte';
	import TextArea from './TextArea.svelte';
	import TextField from './TextField.svelte';

	let {
		draft,
		errors,
		onclose
	}: { draft: TaskDraft | null; errors: TaskFormErrors | null; onclose: () => void } = $props();

	const existing = $derived(draft && draft.taskId !== null ? (draft as Task) : null);
</script>

<Dialog open={draft !== null} title={existing ? 'Edit task' : 'New task'} {onclose}>
	{#if draft}
		<Form action="?/saveTask" label="Task" onsuccess={onclose}>
			{#if existing}
				<input type="hidden" name="taskId" value={existing.taskId} />
			{:else}
				<input type="hidden" name="urgent" value={String(draft.urgent)} />
				<input type="hidden" name="important" value={String(draft.important)} />
			{/if}
			<TextField
				label="Task"
				name="task"
				value={existing?.task ?? ''}
				error={errors?.task}
				required
			/>
			<TextArea
				label="Description"
				name="description"
				value={existing?.description ?? ''}
				rows={4}
			/>
			<DateField
				label="Due date"
				name="dueDate"
				value={existing?.dueDate ?? ''}
				error={errors?.dueDate}
				hint="When the task must be done. Optional."
			/>
			{#if existing}
				<div class="choices">
					<Checkbox label="Urgent" name="urgent" checked={existing.urgent} />
					<Checkbox label="Important" name="important" checked={existing.important} />
				</div>
			{/if}
			<footer>
				<Button type="submit">Save</Button>
				{#if existing}
					<Button type="submit" action="destructive" formaction="?/deleteTask">Delete</Button>
				{/if}
				<Button action="secondary" onclick={onclose}>Cancel</Button>
			</footer>
		</Form>
	{/if}
</Dialog>
