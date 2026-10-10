<script lang="ts">
	import type { Snippet } from 'svelte';

	const LABELS = { info: 'Note:', success: 'Done:', warning: 'Warning:', error: 'Error:' };

	let {
		kind = 'info',
		children
	}: {
		kind?: 'info' | 'success' | 'warning' | 'error';
		children: Snippet;
	} = $props();
</script>

<div class="alert alert--{kind}" role={kind === 'error' ? 'alert' : 'status'}>
	<span class="alert__label">{LABELS[kind]}</span>
	<div>{@render children()}</div>
</div>
