<script lang="ts" module>
	export type JobRow = {
		name: string;
		title: string;
		when: string;
		busy: boolean;
		/** The latest recorded run, kept across restarts. */
		lastRun: { at: number; ok: boolean; outcome: string } | null;
		nextRun: number | null;
	};
</script>

<script lang="ts">
	import DataTable from './DataTable.svelte';
	import DateTime from './DateTime.svelte';

	/** The app's scheduled background jobs, with their last and next runs. */
	let { jobs }: { jobs: JobRow[] } = $props();
</script>

<DataTable caption="Background jobs" columns={['Job', 'Runs', 'Last run', 'Next run']} rows={jobs}>
	{#snippet row(job)}
		<td class="job-cell">
			{job.title}
			{#if job.lastRun}
				<small data-tone={job.lastRun.ok ? undefined : 'danger'}
					>{job.lastRun.ok ? 'Last time:' : 'Failed last time:'} {job.lastRun.outcome}</small
				>
			{/if}
		</td>
		<td>{job.when}</td>
		<td>
			{#if job.busy}
				Running now
			{:else if job.lastRun}
				<DateTime epochMs={job.lastRun.at} withTime />
			{:else}
				Never
			{/if}
		</td>
		<td>
			{#if job.nextRun !== null}<DateTime epochMs={job.nextRun} withTime />{:else}Stopped{/if}
		</td>
	{/snippet}
</DataTable>
