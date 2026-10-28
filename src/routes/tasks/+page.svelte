<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TaskMatrix from '#lib/components/TaskMatrix.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Tasks · Social Sanity</title>
</svelte:head>

<PageHeader title="Tasks">
	{#snippet lede()}
		Click a pane to add a task there, click a task to edit it, and drag tasks between panes.
	{/snippet}
</PageHeader>

{#if form && 'error' in form}
	<Alert tone="danger">{form.error}</Alert>
{/if}

<TaskMatrix
	tasks={data.tasks}
	today={data.today}
	errors={form && 'taskErrors' in form ? (form.taskErrors ?? null) : null}
/>
