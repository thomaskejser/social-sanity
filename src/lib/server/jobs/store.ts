import { db } from '../db/index.ts';
import saveRunSql from './sql/save-run.sql?raw';
import listRunsSql from './sql/list-runs.sql?raw';

/** What a job did on its latest run. */
export type JobRun = {
	name: string;
	startedAt: number;
	finishedAt: number;
	ok: boolean;
	outcome: string;
};

const statements = {
	save: db.prepare(saveRunSql),
	list: db.prepare<[], Omit<JobRun, 'ok'> & { ok: number }>(listRunsSql)
};

export function saveJobRun(run: JobRun) {
	statements.save.run({
		background_job: run.name,
		started_at: run.startedAt,
		finished_at: run.finishedAt,
		ok: run.ok ? 1 : 0,
		outcome: run.outcome
	});
}

export function listJobRuns(): Map<string, JobRun> {
	return new Map(statements.list.all().map((run) => [run.name, { ...run, ok: run.ok === 1 }]));
}
