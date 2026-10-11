<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from '#lib/tone.ts';

	const LABELS: Record<Tone, string> = {
		info: 'Note:',
		neutral: 'Note:',
		ok: 'Done:',
		warn: 'Warning:',
		danger: 'Error:'
	};

	let { tone = 'info', children }: { tone?: Tone; children: Snippet } = $props();
</script>

<div role={tone === 'danger' ? 'alert' : 'status'} data-tone={tone}>
	<strong>{LABELS[tone]}</strong>
	<div>{@render children()}</div>
</div>
