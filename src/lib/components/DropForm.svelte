<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';

	/** A hidden form that a drag-and-drop target submits to a form action. */
	let { action }: { action: string } = $props();

	let form: HTMLFormElement;
	let fields = $state<Record<string, string>>({});

	export async function submit(values: Record<string, string>) {
		fields = values;
		await tick();
		form.requestSubmit();
	}
</script>

<form
	bind:this={form}
	method="POST"
	{action}
	hidden
	use:enhance={() =>
		async ({ update }) => {
			await update({ navigate: false });
		}}
>
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
</form>
