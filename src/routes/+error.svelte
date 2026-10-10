<script lang="ts">
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
</script>

<PageHeader title="Something went wrong" />

<Alert kind="error">{page.status}: {page.error?.message}</Alert>
