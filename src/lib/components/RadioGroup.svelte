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

<fieldset class="radio-group" aria-describedby={error || hint ? `${id}-desc` : undefined}>
	<legend>{legend}</legend>
	<div class="radio-group__options">
		{#each options as option (option.value)}
			<div class="radio-group__option">
				<input
					type="radio"
					id="{id}-{option.value}"
					{name}
					value={option.value}
					bind:group={value}
					aria-describedby={option.description ? `${id}-${option.value}-desc` : undefined}
				/>
				<label class="radio-group__label" for="{id}-{option.value}">{option.label}</label>
				{#if option.description}
					<span class="radio-group__description" id="{id}-{option.value}-desc"
						>{option.description}</span
					>
				{/if}
			</div>
		{/each}
	</div>
	{#if error}
		<p class="field__error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field__hint" id="{id}-desc">{hint}</p>
	{/if}
</fieldset>
