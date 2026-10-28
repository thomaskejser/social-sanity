import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db, flag: Number, fromFlag: (v: number | null) => v === 1 }));

const claude = vi.hoisted(() => ({ answer: vi.fn() }));
vi.mock('../claude.ts', () => ({
	askClaude: claude.answer,
	claudeReady: () => true,
	claudeErrorMessage: String
}));
vi.mock('../humans/google-contacts.ts', () => ({
	contactNationalPhones: async () => [],
	isGoogleConnected: () => false
}));

const { autoEnrichState, decidePause, isAutoEnriching, startAutoEnrich, stopAutoEnrich } =
	await import('./auto.ts');
const { findCompanyByName } = await import('../companies/store.ts');
const { nextToEnrich } = await import('./walk.ts');
const { createHuman, getHuman, listDetails } = await import('../humans/store.ts');
const { listSocialAccounts } = await import('../social-accounts.ts');

const human = (name: string) =>
	createHuman({ human: name, firstName: '', middleNames: [], familyName: '', birthday: '' });

const EMPTY = {
	identity: '',
	name: { first_name: '', family_name: '', reason: '', confidence: 'low' },
	birthday: { value: '', reason: '', confidence: 'low' },
	places: [],
	phones: [],
	phone_country_codes: [],
	social_accounts: [],
	sources: []
};

describe('enriching automatically', () => {
	beforeEach(() => {
		db.exec('DELETE FROM human;');
		claude.answer.mockReset();
	});

	it('saves only what the AI is highly confident about', async () => {
		const id = human('Ada Lovelace');
		claude.answer.mockResolvedValue({
			...EMPTY,
			birthday: { value: '1815-12-10', reason: 'x', confidence: 'high' },
			places: [{ type: 'city', address: 'London', reason: 'x', confidence: 'medium' }],
			social_accounts: [
				{ url: 'https://github.com/ada', reason: 'x', confidence: 'high' },
				{ url: 'https://x.com/ada', reason: 'x', confidence: 'low' }
			]
		});
		await startAutoEnrich('human');

		expect(getHuman(id)!.birthday).toBe('1815-12-10');
		expect(listDetails(id, 'address')).toEqual([]);
		expect(listSocialAccounts('human', id).map((a) => a.url)).toEqual(['https://github.com/ada']);
		const [entry] = autoEnrichState('human').entries;
		expect(entry.added).toHaveLength(2);
		expect(entry.added[1]).toBe('Social media: https://github.com/ada');
		expect(autoEnrichState('human').running).toBe(false);
	});

	it('logs a record with nothing confident found, marks it and moves on', async () => {
		const first = human('Ada Lovelace');
		const second = human('Grace Hopper');
		claude.answer.mockResolvedValue(EMPTY);
		await startAutoEnrich('human');

		const { entries } = autoEnrichState('human');
		expect(entries.map((e) => e.id)).toEqual([second, first]);
		expect(entries.every((e) => !e.added.length && !e.error)).toBe(true);
		expect(nextToEnrich('human', 0)).toBeUndefined();
	});

	it('stops after the lookup in progress when asked', async () => {
		const first = human('Ada Lovelace');
		human('Grace Hopper');
		let release!: () => void;
		claude.answer.mockImplementation(
			() => new Promise((resolve) => (release = () => resolve(EMPTY)))
		);
		const run = startAutoEnrich('human');
		await vi.waitFor(() => expect(claude.answer).toHaveBeenCalledTimes(1));

		expect(stopAutoEnrich('human')).toEqual({ id: first, name: 'Ada Lovelace' });
		expect(isAutoEnriching('human')).toBe(false);
		release();
		await run;
		expect(claude.answer).toHaveBeenCalledTimes(1);
		expect(autoEnrichState('human').entries.map((e) => e.id)).toEqual([first]);
	});

	it('shows only the last ten looked up, but counts them all', async () => {
		const ids = Array.from({ length: 12 }, (_, i) => human(`Person ${i}`));
		claude.answer.mockResolvedValue({
			...EMPTY,
			social_accounts: [{ url: 'https://github.com/x', reason: 'x', confidence: 'high' }]
		});
		await startAutoEnrich('human');

		const state = autoEnrichState('human');
		expect(state.entries.map((e) => e.id)).toEqual(ids.slice(2).reverse());
		expect([state.looked, state.saved]).toEqual([12, 12]);
	});

	it('gives up after three failed lookups in a row', async () => {
		for (const name of ['A', 'B', 'C', 'D']) human(name);
		claude.answer.mockRejectedValue(new Error('no credit'));
		await startAutoEnrich('human');

		const state = autoEnrichState('human');
		expect(state.entries).toHaveLength(3);
		expect(state.error).toContain('no credit');
	});
});

describe('pausing when a record looks like another kind', () => {
	const COMPANY = { kind: 'company', reason: 'A consultancy', confidence: 'high' };

	beforeEach(() => {
		db.exec('DELETE FROM human; DELETE FROM company;');
		claude.answer.mockReset();
		stopAutoEnrich('human');
	});

	async function pauseAt(name: string) {
		const id = human(name);
		const other = human('Grace Hopper');
		claude.answer.mockImplementation(async ({ prompt }: { prompt: string }) =>
			prompt.includes(name)
				? {
						...EMPTY,
						kind: COMPANY,
						birthday: { value: '1980-01-01', reason: '', confidence: 'high' }
					}
				: EMPTY
		);
		await startAutoEnrich('human');
		return { id, other };
	}

	it('stops at the record, saving nothing, and waits for the user', async () => {
		const { id, other } = await pauseAt('Acme Consulting');
		const state = autoEnrichState('human');
		expect(state.paused?.id).toBe(id);
		expect(state.paused?.enrichment.kind?.kind).toBe('company');
		expect(state.running).toBe(false);
		expect(isAutoEnriching('human')).toBe(true);
		expect(getHuman(id)!.birthday).toBe('');
		expect(nextToEnrich('human', 0)?.id).toBe(other);
	});

	it('moves the record when asked, then carries on with the next', async () => {
		const { id, other } = await pauseAt('Acme Consulting');
		expect(await decidePause('human', id, { to: 'company' })).toBe(true);
		await vi.waitFor(() => expect(autoEnrichState('human').running).toBe(false));

		expect(getHuman(id)).toBeUndefined();
		expect(findCompanyByName('Acme Consulting')).toBeDefined();
		const state = autoEnrichState('human');
		expect(state.paused).toBeNull();
		expect(state.entries.map((e) => [e.id, e.added])).toEqual([
			[other, []],
			[id, ['Made it a company']]
		]);
	});

	it('keeps the record when asked, saving what is highly confident', async () => {
		const { id } = await pauseAt('Acme Consulting');
		expect(await decidePause('human', id, 'keep')).toBe(true);
		await vi.waitFor(() => expect(autoEnrichState('human').running).toBe(false));
		expect(getHuman(id)!.birthday).toBe('1980-01-01');
		expect(findCompanyByName('Acme Consulting')).toBeUndefined();
	});

	it('refuses a decision on a record it is not waiting on, and Stop ends the wait', async () => {
		const { id, other } = await pauseAt('Acme Consulting');
		expect(await decidePause('human', other, 'keep')).toBe(false);
		expect(stopAutoEnrich('human')).toEqual({ id, name: 'Acme Consulting' });
		expect(isAutoEnriching('human')).toBe(false);
		expect(await decidePause('human', id, 'keep')).toBe(false);
	});
});
