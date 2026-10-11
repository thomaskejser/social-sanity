<script lang="ts">
	let {
		label,
		name,
		accept,
		multiple = false,
		hint,
		error
	}: {
		label: string;
		name: string;
		accept?: string;
		multiple?: boolean;
		hint?: string;
		error?: string;
	} = $props();

	const id = $props.id();
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input
		{id}
		{name}
		type="file"
		{accept}
		{multiple}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? `${id}-desc` : undefined}
	/>
	{#if error}
		<p class="field-error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field-hint" id="{id}-desc">{hint}</p>
	{/if}
</div>
