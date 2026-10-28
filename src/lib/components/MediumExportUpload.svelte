<script lang="ts" module>
	import type { MemberKind } from '#lib/groups/member.ts';
	import type { MediumFollow } from '#lib/medium-export.ts';

	export type MediumExportView = {
		savedAs: string;
		folders: { folder: string; files: number }[];
		follows: MediumFollow[];
		imported: (MediumFollow & {
			record: { kind: MemberKind; id: number; name: string };
			created: boolean;
		})[];
	};

	export type FeedReadingView = {
		running: boolean;
		total: number;
		read: number;
		failed: number;
		lastError: string | null;
	};
</script>

<script lang="ts">
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import DataTable from './DataTable.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import FileField from './FileField.svelte';
	import Form from './Form.svelte';
	import MemberLink from './MemberLink.svelte';

	/** Upload of the ZIP archive Medium sends, and what was found in it. */
	let {
		result,
		reading,
		error
	}: { result: MediumExportView | null; reading: FeedReadingView; error?: string } = $props();

	const writers = $derived(result?.follows.filter((f) => f.kind === 'writer').length ?? 0);
	const publications = $derived((result?.follows.length ?? 0) - writers);
	const created = $derived(result?.imported.filter((f) => f.created).length ?? 0);
</script>

<article class="card" aria-labelledby="medium-export">
	<header><h2 id="medium-export">Import whom you follow</h2></header>
	<p class="card-note">
		On Medium, open Settings → Security and apps → Download your information. Medium e-mails you a
		link to a ZIP archive; upload it here. Writers you follow become humans and publications become
		channels (one with the same name is reused), each with its Medium feed, so their stories show in
		Consume. Uploading a newer export later only adds who is new.
	</p>

	{#if reading.total}
		<Alert tone={reading.running ? 'info' : reading.failed ? 'warn' : 'ok'}>
			{#if reading.running}
				Reading the feeds in the background: {reading.read + reading.failed} of {reading.total} done.
				Medium limits how fast feeds can be read, so this can take a few minutes; reload to see progress.
			{:else}
				Read {reading.read} of {reading.total} feeds; their stories are in Consume.{#if reading.failed}
					{reading.failed} could not be read ({reading.lastError}); the feed reader tries them again
					every 30 minutes.{/if}
			{/if}
		</Alert>
	{/if}

	<Form action="?/uploadExport" label="Upload Medium export" enctype="multipart/form-data">
		<FileField label="Medium export (ZIP)" name="archive" accept=".zip,application/zip" {error} />
		<footer>
			<Button type="submit" busyLabel="Importing…">Upload and import</Button>
		</footer>
	</Form>

	{#if result}
		<Alert tone={result.follows.length ? 'ok' : 'warn'}>
			{#if result.follows.length}
				Imported {writers} writers and {publications} publications you follow; {created} were new to the
				app.
			{:else}
				No follows recognised. The folders below show what the archive holds.
			{/if}
		</Alert>
		{#if result.imported.length}
			<DataTable
				caption="Imported from Medium"
				columns={['In the app', 'On Medium']}
				rows={result.imported}
			>
				{#snippet row(follow)}
					<td>
						<MemberLink
							kind={follow.record.kind}
							id={follow.record.id}
							name={follow.record.name}
						/>{follow.created ? ' (new)' : ''}
					</td>
					<td><ExternalLink href={follow.url}>{follow.name}</ExternalLink></td>
				{/snippet}
			</DataTable>
		{:else}
			<DataTable
				caption="What the archive holds"
				columns={['Folder', 'Files']}
				rows={result.folders}
			>
				{#snippet row(folder)}
					<td><code>{folder.folder}</code></td>
					<td>{folder.files}</td>
				{/snippet}
			</DataTable>
		{/if}
	{/if}
</article>
