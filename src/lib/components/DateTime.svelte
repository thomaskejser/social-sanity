<script lang="ts">
	let { epochMs, withTime = false }: { epochMs: number; withTime?: boolean } = $props();

	const date = $derived(new Date(epochMs));
</script>

<time datetime={date.toISOString()}>
	{withTime
		? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		: date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
</time>
