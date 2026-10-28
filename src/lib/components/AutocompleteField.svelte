<script lang="ts">
	/**
	 * A search field that suggests values as you type, from `source?q=<text>` (a JSON array of
	 * strings). Suggestions use the browser's own `<datalist>`, so keyboard and screen readers work;
	 * picking one submits the field's form.
	 */
	let {
		label,
		name,
		source,
		value = '',
		placeholder
	}: {
		label: string;
		name: string;
		source: string;
		value?: string;
		placeholder?: string;
	} = $props();

	const id = $props.id();
	let suggestions = $state<string[]>([]);
	let pending: AbortController | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function oninput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const text = input.value.trim();
		// Picking a suggestion fills the field without typing; search right away instead of
		// waiting for a second Enter.
		const picked = !(event instanceof InputEvent) || event.inputType === 'insertReplacementText';
		if (picked && suggestions.includes(text)) {
			input.form?.requestSubmit();
			return;
		}
		clearTimeout(timer);
		pending?.abort();
		if (!text) {
			suggestions = [];
			return;
		}
		timer = setTimeout(async () => {
			pending = new AbortController();
			try {
				const response = await fetch(`${source}?${new URLSearchParams({ q: text })}`, {
					signal: pending.signal
				});
				if (response.ok) suggestions = [...new Set((await response.json()) as string[])];
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
			}
		}, 150);
	}
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input
		{id}
		{name}
		type="search"
		{value}
		{placeholder}
		list="{id}-list"
		autocomplete="off"
		{oninput}
	/>
	<datalist id="{id}-list">
		{#each suggestions as suggestion (suggestion)}
			<option value={suggestion}></option>
		{/each}
	</datalist>
</div>
