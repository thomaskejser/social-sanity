import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db, flag: Number, fromFlag: (v: number | null) => v === 1 }));

const claude = vi.hoisted(() => ({ answer: vi.fn() }));
vi.mock('../claude.ts', () => ({ askClaude: claude.answer, claudeReady: () => true }));

const { findDuplicates, pendingCandidates, setCandidateStatus } = await import('./duplicates.ts');
const { createChannel, deleteChannel } = await import('../channels/store.ts');

const channel = (name: string) => createChannel({ channel: name, website: '', notes: '' });

describe('Auto Merge candidates', () => {
	let a: number, b: number, c: number;

	beforeEach(() => {
		db.exec('DELETE FROM merge_candidate; DELETE FROM channel;');
		claude.answer.mockReset();
		a = channel('Toy Poodle Fun');
		b = channel('toypoodlefun');
		c = channel('Cooking');
	});

	it('keeps the pairs Claude reports, once, smaller id first', async () => {
		claude.answer.mockResolvedValue({
			pairs: [
				{ first: b, second: a, reason: 'Handle of the same channel' },
				{ first: a, second: b, reason: 'Repeated' },
				{ first: a, second: a, reason: 'Itself' },
				{ first: a, second: 9999, reason: 'Unknown id' }
			]
		});
		expect(await findDuplicates('channel')).toBe(1);
		const [pair] = pendingCandidates('channel');
		expect([pair.first.id, pair.second.id]).toEqual([a, b]);
		expect(pair.reason).toBe('Handle of the same channel');
		expect(claude.answer.mock.calls[0][0].prompt).toContain('toypoodlefun');
	});

	it('never suggests a pair again once the user decided', async () => {
		claude.answer.mockResolvedValue({ pairs: [{ first: a, second: b, reason: 'x' }] });
		await findDuplicates('channel');
		setCandidateStatus(pendingCandidates('channel')[0].mergeCandidateId, 'DISMISSED');
		expect(await findDuplicates('channel')).toBe(0);
		expect(pendingCandidates('channel')).toEqual([]);
	});

	it('drops a pair whose record is gone', async () => {
		claude.answer.mockResolvedValue({ pairs: [{ first: a, second: c, reason: 'x' }] });
		await findDuplicates('channel');
		deleteChannel(c);
		expect(pendingCandidates('channel')).toEqual([]);
	});
});
