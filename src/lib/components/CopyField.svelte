<script lang="ts">
	import Button from './Button.svelte';

	let {
		label,
		value,
		copied,
		oncopy
	}: { label: string; value: string; copied: boolean; oncopy: () => void } = $props();

	const id = $props.id();
</script>

<div class="field copy-field">
	<label for={id}>{label}</label>
	<div>
		<input {id} type="text" readonly {value} onfocus={(event) => event.currentTarget.select()} />
		<Button action="secondary" onclick={oncopy}>{copied ? 'Copied' : 'Copy'}</Button>
	</div>
</div>
