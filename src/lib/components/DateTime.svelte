<script lang="ts">
	let { epochMs }: { epochMs: number } = $props();

	const date = $derived(new Date(epochMs));
</script>

<time datetime={date.toISOString()}>
	{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
</time>
