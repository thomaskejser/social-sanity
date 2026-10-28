<script lang="ts">
	import { describeDay, type Detail, type DetailKind } from '#lib/humans/details.ts';
	import Button from './Button.svelte';
	import DateField from './DateField.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';

	let {
		kind,
		title,
		items,
		valueLabel,
		hint,
		error
	}: {
		kind: DetailKind;
		title: string;
		items: Detail[];
		valueLabel: string;
		hint?: string;
		error?: string;
	} = $props();

	const typed = $derived(kind !== 'nickname');
</script>

<section class="card" aria-label={title}>
	<header><h2>{title}</h2></header>
	<ul class="detail-list">
		{#each items as item (item.detailId)}
			<li>
				{#if item.type}<span class="detail-type">{item.type}</span>{/if}
				{#if kind === 'phone'}
					<a href="tel:{item.value}">{item.value}</a>
				{:else if kind === 'address' && item.mapUrl}
					<ExternalLink href={item.mapUrl}>{item.value}</ExternalLink>
				{:else if kind === 'specialDay'}
					{describeDay(item.value)}
				{:else}
					{item.value}
				{/if}
				<Form action="?/removeDetail" label="Remove {item.value}">
					<input type="hidden" name="kind" value={kind} />
					<input type="hidden" name="detailId" value={item.detailId} />
					<Button type="submit" action="inline">Remove</Button>
				</Form>
			</li>
		{:else}
			<li>None yet.</li>
		{/each}
	</ul>
	<Form action="?/addDetail" label="Add to {title}" variant="detail">
		<input type="hidden" name="kind" value={kind} />
		{#if typed}
			<TextField label="Type" name="type" placeholder="e.g. home" />
		{/if}
		{#if kind === 'specialDay'}
			{#key items.length}
				<DateField label={valueLabel} name="value" {hint} {error} allowNoYear required />
			{/key}
		{:else}
			<TextField label={valueLabel} name="value" {hint} {error} required />
		{/if}
		<footer><Button type="submit" action="secondary">Add</Button></footer>
	</Form>
</section>
