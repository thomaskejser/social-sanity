<script lang="ts">
	let {
		label,
		name,
		type = 'text',
		value = $bindable(''),
		hint,
		error,
		required = false,
		autocomplete,
		placeholder
	}: {
		label: string;
		name: string;
		type?: 'text' | 'password' | 'email' | 'url' | 'search' | 'number' | 'datetime-local';
		value?: string;
		hint?: string;
		error?: string;
		required?: boolean;
		autocomplete?: HTMLInputElement['autocomplete'];
		placeholder?: string;
	} = $props();

	const id = $props.id();
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input
		{id}
		{name}
		{type}
		{required}
		{autocomplete}
		{placeholder}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? `${id}-desc` : undefined}
	/>
	{#if error}
		<p class="field-error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field-hint" id="{id}-desc">{hint}</p>
	{/if}
</div>
