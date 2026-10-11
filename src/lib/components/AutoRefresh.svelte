<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { active, intervalMs = 2000 }: { active: boolean; intervalMs?: number } = $props();

	$effect(() => {
		if (!active) return;
		const timer = setInterval(() => invalidateAll(), intervalMs);
		return () => clearInterval(timer);
	});
</script>
