import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));

vi.mock('../db/index.ts', () => ({ db }));

const claude = vi.hoisted(() => ({ ready: true, answer: vi.fn() }));
vi.mock('../claude.ts', () => ({
	askClaude: claude.answer,
	claudeReady: () => claude.ready,
	claudeErrorMessage: (error: unknown) => String(error)
}));

const { sortChannels, sortState, listChannels } = await import('./subscriptions.ts');
const { createCompany } = await import('../companies/store.ts');
const { moveReferences } = await import('../references/store.ts');

function importChannel(id: number, channelId: string, title: string) {
	db.prepare(
		`INSERT INTO youtube_channel (youtube_channel_id, channel_id, youtube_channel, fetched_at)
		 VALUES (?, ?, ?, 0)`
	).run(id, channelId, title);
}

function answerAll() {
	claude.answer.mockImplementation(async ({ prompt }: { prompt: string }) => ({
		channels: (JSON.parse(prompt) as { id: number; title: string }[]).map((c) => ({
			id: c.id,
			kind: c.title.startsWith('Acme') ? 'COMPANY' : c.title === 'Veritasium' ? 'CHANNEL' : 'HUMAN',
			name: c.title,
			reason: 'test'
		}))
	}));
}

describe('sortChannels', () => {
	beforeEach(() => {
		claude.ready = true;
		claude.answer.mockReset();
		for (const table of ['youtube_channel', 'external_reference', 'content_source'])
			db.exec(`DELETE FROM ${table}`);
	});

	it('adds every imported channel as what Claude says it is', async () => {
		importChannel(1, 'UC1', 'Ada Lovelace');
		importChannel(2, 'UC2', 'Acme Corp');
		importChannel(3, 'UC3', 'Veritasium');
		answerAll();

		expect(await sortChannels()).toEqual({ sorted: 3, added: 3 });
		const rows = listChannels(10, 0);
		expect(rows.find((r) => r.channelId === 'UC1')?.human).toBe('Ada Lovelace');
		expect(rows.find((r) => r.channelId === 'UC2')?.company).toBe('Acme Corp');
		expect(rows.find((r) => r.channelId === 'UC3')?.appChannel).toBe('Veritasium');
	});

	it('never sorts an added channel again, and follows the record the user changed it to', async () => {
		importChannel(1, 'UC1', 'Grace Hopper');
		answerAll();
		await sortChannels();
		const humanId = listChannels(10, 0)[0].humanId!;
		const companyId = createCompany({ company: 'Hopper Inc', website: '', notes: '' });
		moveReferences({ humanId }, { companyId });

		claude.answer.mockClear();
		expect(await sortChannels()).toEqual({ sorted: 0, added: 0 });
		expect(claude.answer).not.toHaveBeenCalled();
		expect(listChannels(10, 0)[0]).toMatchObject({ humanId: null, company: 'Hopper Inc' });
	});

	it('leaves channels waiting while Claude is not set up', async () => {
		claude.ready = false;
		importChannel(1, 'UC1', 'Ada Lovelace');
		expect(await sortChannels()).toEqual({ sorted: 0, added: 0 });
		expect(claude.answer).not.toHaveBeenCalled();
		expect(listChannels(10, 0)[0].addedAt).toBeNull();
	});

	it('stops on a channel Claude leaves out, keeping it waiting', async () => {
		importChannel(1, 'UC1', 'Ada Lovelace');
		claude.answer.mockResolvedValue({ channels: [] });
		expect(await sortChannels()).toEqual({ sorted: 0, added: 0 });
		expect(claude.answer).toHaveBeenCalledOnce();
		expect(listChannels(10, 0)[0].addedAt).toBeNull();
	});

	it('records a failure for the page and clears it on the next good run', async () => {
		importChannel(1, 'UC1', 'Ada Lovelace');
		claude.answer.mockRejectedValue(new Error('rate limited'));
		await expect(sortChannels()).rejects.toThrow('rate limited');
		expect(sortState()).toEqual({ running: false, error: 'Error: rate limited' });

		answerAll();
		await sortChannels();
		expect(sortState()).toEqual({ running: false, error: null });
	});

	it('joins a run that is already going', async () => {
		importChannel(1, 'UC1', 'Ada Lovelace');
		answerAll();
		const first = sortChannels();
		expect(sortState().running).toBe(true);
		expect(sortChannels()).toBe(first);
		await first;
		expect(claude.answer).toHaveBeenCalledOnce();
	});
});
