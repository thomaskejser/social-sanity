<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/** A link that takes the user away from Social Sanity, and says so. */
	let { href, children }: { href: string; children: Snippet } = $props();

	const host = $derived.by(() => {
		try {
			return new URL(href).host.replace(/^www\./, '');
		} catch {
			return href;
		}
	});
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
<a class="leave-link" {href} target="_blank" rel="noopener noreferrer">
	{@render children()}
	<Icon name="external" />
	<small>leaves Social Sanity for {host}</small>
</a>
