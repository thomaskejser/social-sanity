<script lang="ts">
	let {
		label,
		name,
		value = $bindable(''),
		rows = 6,
		hint,
		error,
		required = false,
		placeholder
	}: {
		label: string;
		name: string;
		value?: string;
		rows?: number;
		hint?: string;
		error?: string;
		required?: boolean;
		placeholder?: string;
	} = $props();

	const id = $props.id();
</script>

<div class="field">
	<label for={id}>{label}</label>
	<textarea
		{id}
		{name}
		{rows}
		{required}
		{placeholder}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? `${id}-desc` : undefined}></textarea>
	{#if error}
		<p class="field__error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field__hint" id="{id}-desc">{hint}</p>
	{/if}
</div>
