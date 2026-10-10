<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Log in · Social Sanity</title>
</svelte:head>

<PageHeader title="Log in" />

<Form label="Log in" variant="login">
	<TextField
		label="Password"
		name="password"
		type="password"
		autocomplete="current-password"
		required
		error={form?.error}
	/>
	<Button type="submit">Log in</Button>
</Form>
