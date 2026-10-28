<script lang="ts">
	import { inQuadrant, type Quadrant, type Task } from '#lib/tasks/task.ts';
	import Button from './Button.svelte';
	import TaskCard from './TaskCard.svelte';

	let {
		quadrant,
		tasks,
		today,
		onadd,
		onedit,
		ondroptask
	}: {
		quadrant: Quadrant;
		tasks: Task[];
		today: string;
		onadd: (quadrant: Quadrant) => void;
		onedit: (task: Task) => void;
		ondroptask: (taskId: string, quadrant: Quadrant) => void;
	} = $props();

	const id = $props.id();
	const mine = $derived(tasks.filter((task) => inQuadrant(task, quadrant)));
	let dropping = $state(false);

	function ondragover(event: DragEvent) {
		if (!event.dataTransfer?.types.includes('application/x-task')) return;
		event.preventDefault();
		dropping = true;
	}

	function ondrop(event: DragEvent) {
		dropping = false;
		const taskId = event.dataTransfer?.getData('application/x-task');
		if (!taskId) return;
		event.preventDefault();
		ondroptask(taskId, quadrant);
	}

	function onclick(event: MouseEvent) {
		if ((event.target as HTMLElement).closest('button, a')) return;
		onadd(quadrant);
	}
</script>

<!-- The pane itself is a click target for mouse users; the "Add task" button is the keyboard path. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<section
	class="task-pane"
	aria-labelledby={id}
	data-urgent={quadrant.urgent}
	data-important={quadrant.important}
	data-dropping={dropping || undefined}
	{ondragover}
	ondragleave={() => (dropping = false)}
	{ondrop}
	{onclick}
>
	<header>
		<h2 {id}>{quadrant.title}</h2>
		<p>{quadrant.hint}</p>
	</header>
	<ul>
		{#each mine as task (task.taskId)}
			<TaskCard {task} {today} {onedit} />
		{/each}
	</ul>
	<footer>
		<Button action="inline" onclick={() => onadd(quadrant)}>Add task</Button>
	</footer>
</section>
