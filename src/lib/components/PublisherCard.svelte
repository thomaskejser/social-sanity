<script lang="ts" module>
	import type { SourceView } from './SourceList.svelte';

	export type PublisherView = {
		publisherId: number;
		publisher: string;
		publisherKind: 'COMPANY' | 'AGENT';
		kudos: number;
		sources: SourceView[];
	};

	export const KIND_LABELS: Record<PublisherView['publisherKind'], string> = {
		COMPANY: 'Company',
		AGENT: 'Agent'
	};
</script>

<script lang="ts">
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import KudosBar from './KudosBar.svelte';
	import SourceList from './SourceList.svelte';

	let { publisher, error }: { publisher: PublisherView; error?: string } = $props();
	const id = $props.id();
</script>

<article class="card" aria-labelledby={id}>
	<header>
		<h2 {id}>{publisher.publisher}</h2>
		<Badge>{KIND_LABELS[publisher.publisherKind]}</Badge>
	</header>
	<KudosBar
		kudos={publisher.kudos}
		action="?/kudos"
		label={publisher.publisher}
		fields={{ publisherId: publisher.publisherId }}
	/>
	<SourceList sources={publisher.sources} fields={{ publisherId: publisher.publisherId }} {error} />
	<Form action="?/deletePublisher" label="Delete {publisher.publisher}">
		<input type="hidden" name="publisherId" value={publisher.publisherId} />
		<footer><Button type="submit" action="destructive">Delete</Button></footer>
	</Form>
</article>
