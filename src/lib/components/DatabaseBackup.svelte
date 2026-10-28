<script lang="ts">
	import { resolve } from '$app/paths';

	/** Download of the whole database, and how backup agents fetch it. */
	let { apiEnabled }: { apiEnabled: boolean } = $props();
</script>

<section aria-labelledby="database">
	<h2 id="database">Database</h2>
	<p>
		A copy of everything the app stores, as one SQLite file. Tokens and secrets in it stay encrypted
		with <code>SOCIAL_SANITY_TOKEN_ENC_KEY</code>, which is not in the file; keep that key to
		restore.
	</p>
	<p>
		<a href={resolve('/settings/database')} data-action="primary" download data-sveltekit-reload
			>Download database</a
		>
	</p>
	<p>
		Backup agents can fetch the same file from <code>GET /api/backup</code> with the header
		<code>Authorization: Bearer &lt;token&gt;</code>.
		{#if apiEnabled}
			The token is the value of <code>SOCIAL_SANITY_BACKUP_TOKEN</code>.
		{:else}
			This is off until <code>SOCIAL_SANITY_BACKUP_TOKEN</code> is set (at least 32 characters, e.g.
			from <code>openssl rand -hex 32</code>) and the app is restarted.
		{/if}
	</p>
</section>
