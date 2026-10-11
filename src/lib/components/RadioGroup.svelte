<script lang="ts">
	let {
		legend,
		name,
		options,
		value = $bindable(''),
		hint,
		error
	}: {
		legend: string;
		name: string;
		options: { value: string; label: string; description?: string }[];
		value?: string;
		hint?: string;
		error?: string;
	} = $props();

	const id = $props.id();
</script>

<fieldset aria-describedby={error || hint ? `${id}-desc` : undefined}>
	<legend>{legend}</legend>
	<div class="choices">
		{#each options as option (option.value)}
			<div class="choice">
				<input
					type="radio"
					id="{id}-{option.value}"
					{name}
					value={option.value}
					bind:group={value}
					aria-describedby={option.description ? `${id}-${option.value}-desc` : undefined}
				/>
				<label for="{id}-{option.value}">{option.label}</label>
				{#if option.description}
					<span class="choice-description" id="{id}-{option.value}-desc">{option.description}</span>
				{/if}
			</div>
		{/each}
	</div>
	{#if error}
		<p class="field-error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field-hint" id="{id}-desc">{hint}</p>
	{/if}
</fieldset>
