<script lang="ts">
	let {
		label,
		name,
		options,
		value = $bindable(''),
		hint,
		error
	}: {
		label: string;
		name: string;
		options: { value: string; label: string }[];
		value?: string;
		hint?: string;
		error?: string;
	} = $props();

	const id = $props.id();
</script>

<div class="field">
	<label for={id}>{label}</label>
	<select
		{id}
		{name}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? `${id}-desc` : undefined}
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if error}
		<p class="field-error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field-hint" id="{id}-desc">{hint}</p>
	{/if}
</div>
