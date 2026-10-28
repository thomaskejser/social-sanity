<script lang="ts">
	import Alert from './Alert.svelte';

	/** Says the AI found no name for a human known only by an email address. */
	let {
		email
	}: {
		/** The human's display name, which is an email address. */
		email: string;
	} = $props();
</script>

<Alert tone="warn">
	The AI found no name for {email}, so the app still knows them only by this email address. Delete
	them if you don't need them.
</Alert>
