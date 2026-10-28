<script lang="ts">
	import { resolve } from '$app/paths';
	import LinkButton from './LinkButton.svelte';
</script>

<section aria-labelledby="background-jobs">
	<h2 id="background-jobs">Background jobs</h2>
	<p>Imports, feed reading and other work the app does on its own, with when each runs next.</p>
	<p>
		<LinkButton href={resolve('/settings/jobs')} action="secondary">Show background jobs</LinkButton
		>
	</p>
</section>
