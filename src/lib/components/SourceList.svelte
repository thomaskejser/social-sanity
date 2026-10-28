<script lang="ts" module>
	export type SourceView = {
		contentSourceId: number;
		contentSource: string;
		feedUri: string;
		lastFetchedAt: number | null;
		lastFetchOk: boolean | null;
		lastFetchMessage: string | null;
	};
</script>

<script lang="ts">
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';

	let {
		sources,
		fields,
		error
	}: {
		sources: SourceView[];
		/** Hidden fields naming the owner, sent with the add and remove actions. */
		fields: Record<string, string | number>;
		error?: string;
	} = $props();
</script>

<ul class="source-list">
	{#each sources as source (source.contentSourceId)}
		<li>
			<ExternalLink href={source.contentSource}>{source.contentSource}</ExternalLink>
			{#if source.lastFetchOk === null}
				<Badge>Not read yet</Badge>
			{:else if source.lastFetchOk}
				<Badge tone="ok">Feed</Badge>
			{:else}
				<Badge tone="warn">Link only</Badge>
			{/if}
			{#if source.lastFetchMessage}<small>{source.lastFetchMessage}</small>{/if}
			<Form action="?/removeSource" label="Remove {source.contentSource}">
				<input type="hidden" name="contentSourceId" value={source.contentSourceId} />
				<Button type="submit" action="inline">Remove</Button>
			</Form>
		</li>
	{:else}
		<li>No content sources yet.</li>
	{/each}
</ul>
<Form action="?/addSource" label="Add a content source" variant="detail">
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	<TextField
		label="Address (URI)"
		name="uri"
		type="url"
		placeholder="https://blog.example.com"
		hint="A blog, YouTube channel, Mastodon or Bluesky profile, or any page with a feed."
		{error}
		required
	/>
	<footer><Button type="submit" action="secondary">Add source</Button></footer>
</Form>
