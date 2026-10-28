<script lang="ts">
	import Form from './Form.svelte';
	import Icon from './Icon.svelte';

	const MAX_KUDOS = 10;

	let {
		kudos,
		action,
		label,
		fields
	}: {
		kudos: number;
		/** Form action that receives `kudos` plus `fields`. */
		action: string;
		/** Whom the kudos are for, e.g. "Ada Lovelace". */
		label: string;
		fields: Record<string, string | number>;
	} = $props();
</script>

<Form {action} label="Kudos for {label}" variant="kudos">
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	{#each { length: MAX_KUDOS }, i (i)}
		{@const level = i + 1}
		<button
			type="submit"
			name="kudos"
			value={level === kudos ? 0 : level}
			aria-pressed={level <= kudos}
			title={level === kudos ? 'Clear kudos' : `${level} kudos`}
		>
			<Icon name="crown" label={level === kudos ? 'Clear kudos' : `${level} kudos`} />
		</button>
	{/each}
</Form>
