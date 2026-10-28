<script lang="ts">
	import { QUADRANTS, type Quadrant, type Task } from '#lib/tasks/task.ts';
	import DropForm from './DropForm.svelte';
	import TaskDialog, { type TaskDraft, type TaskFormErrors } from './TaskDialog.svelte';
	import TaskPane from './TaskPane.svelte';

	let { tasks, today, errors }: { tasks: Task[]; today: string; errors: TaskFormErrors | null } =
		$props();

	let draft = $state<TaskDraft | null>(null);
	let moveForm: DropForm;

	function move(taskId: string, quadrant: Quadrant) {
		moveForm.submit({
			taskId,
			urgent: String(quadrant.urgent),
			important: String(quadrant.important)
		});
	}
</script>

<div class="task-matrix">
	{#each QUADRANTS as quadrant (quadrant.title)}
		<TaskPane
			{quadrant}
			{tasks}
			{today}
			onadd={(q) => (draft = { taskId: null, urgent: q.urgent, important: q.important })}
			onedit={(task) => (draft = task)}
			ondroptask={move}
		/>
	{/each}
</div>

<DropForm bind:this={moveForm} action="?/moveTask" />
<TaskDialog {draft} {errors} onclose={() => (draft = null)} />
