import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db }));

const { listJobRuns, saveJobRun } = await import('./store.ts');

describe('job runs', () => {
	it('keeps only the latest run of each job', () => {
		saveJobRun({ name: 'a', startedAt: 1, finishedAt: 2, ok: true, outcome: 'first' });
		saveJobRun({ name: 'b', startedAt: 1, finishedAt: 3, ok: true, outcome: 'other' });
		saveJobRun({ name: 'a', startedAt: 5, finishedAt: 6, ok: false, outcome: 'broke' });

		const runs = listJobRuns();
		expect(runs.size).toBe(2);
		expect(runs.get('a')).toEqual({
			name: 'a',
			startedAt: 5,
			finishedAt: 6,
			ok: false,
			outcome: 'broke'
		});
		expect(runs.get('b')?.ok).toBe(true);
	});
});
