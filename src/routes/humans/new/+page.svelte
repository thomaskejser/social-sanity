<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const errors = $derived(form?.humanErrors);
</script>

<svelte:head>
	<title>Add human · Social Sanity</title>
</svelte:head>

<PageHeader title="Add human" back={{ href: resolve('/humans'), label: 'All humans' }}>
	{#snippet lede()}Phone numbers, addresses and sources are added on the human's page next.{/snippet}
</PageHeader>

<Form label="Add a human" variant="settings" resetOnSuccess={false}>
	<TextField label="First name" name="firstName" error={errors?.firstName} />
	<TextField label="Family name" name="familyName" />
	<TextField
		label="Display name"
		name="human"
		error={errors?.human}
		hint="Leave empty to use the first and family name."
	/>
	<footer>
		<Button type="submit">Add human</Button>
	</footer>
</Form>
