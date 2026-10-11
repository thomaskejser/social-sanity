<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from '#lib/tone.ts';

	let { tone = 'neutral', children }: { tone?: Tone; children: Snippet } = $props();
</script>

<span class="badge" data-tone={tone}>{@render children()}</span>
