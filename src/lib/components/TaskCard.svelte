<script lang="ts">
	import { isOverdue, type Task } from '#lib/tasks/task.ts';
	import { describeDay } from '#lib/humans/details.ts';

	let { task, today, onedit }: { task: Task; today: string; onedit: (task: Task) => void } =
		$props();

	const overdue = $derived(isOverdue(task.dueDate, today));

	function ondragstart(event: DragEvent) {
		event.dataTransfer?.setData('application/x-task', String(task.taskId));
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}
</script>

<li>
	<button class="task-card" draggable="true" {ondragstart} onclick={() => onedit(task)}>
		<strong>{task.task}</strong>
		{#if task.dueDate}
			<small data-tone={overdue ? 'danger' : undefined}>
				{overdue ? 'Overdue:' : 'Due'}
				{describeDay(task.dueDate)}
			</small>
		{/if}
	</button>
</li>
