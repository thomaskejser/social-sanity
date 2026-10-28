<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyForm from '#lib/components/CompanyForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Add company · Social Sanity</title>
</svelte:head>

<PageHeader title="Add company" back={{ href: resolve('/companies'), label: 'All companies' }}>
	{#snippet lede()}Phone numbers, addresses and sources are added on the company's page next.{/snippet}
</PageHeader>

<CompanyForm
	company={{ company: '', website: '', notes: '' }}
	errors={form?.companyErrors ?? null}
	submitLabel="Add company"
/>
