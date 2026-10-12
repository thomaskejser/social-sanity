<script lang="ts">
	import Button from './Button.svelte';

	let { label, value }: { label: string; value: string } = $props();

	const id = $props.id();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(value);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="field copy-field">
	<label for={id}>{label}</label>
	<div>
		<input {id} type="text" readonly {value} onfocus={(event) => event.currentTarget.select()} />
		<Button action="secondary" onclick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
	</div>
</div>
