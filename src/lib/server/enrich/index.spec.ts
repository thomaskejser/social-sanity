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

const { applyEnrichment, enrichMember } = await import('./index.ts');
const { nextToEnrich } = await import('./walk.ts');
const { createHuman, getHuman } = await import('../humans/store.ts');
const { createCompany } = await import('../companies/store.ts');
const { listHumanAvatars } = await import('../avatars/store.ts');

const PNG = 'https://img.example/ada.png';
const PAGE = 'https://site.example/about';
const OG = 'https://cdn.example/ada.jpg';

/** Answers the image addresses with a picture, the page with HTML naming OG, anything else 404. */
function stubWeb() {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL) => {
			const url = String(input);
			if (url === PNG || url === OG)
				return new Response(new Uint8Array([1, 2, 3]), {
					headers: { 'content-type': url === PNG ? 'image/png' : 'image/jpeg' }
				});
			if (url === PAGE)
				return new Response(
					`<html><head><meta property="og:image" content="${OG}"></head></html>`,
					{
						headers: { 'content-type': 'text/html' }
					}
				);
			return new Response('', { status: 404 });
		})
	);
}

const human = (name: string) =>
	createHuman({ human: name, firstName: '', middleNames: [], familyName: '', birthday: '' });

const form = (values: Record<string, string>) => {
	const data = new FormData();
	for (const [name, value] of Object.entries(values)) data.append(name, value);
	return data;
};

const NO_NAME = { first_name: '', family_name: '', reason: '', confidence: 'low' };

describe('finding the name of a human known only by email', () => {
	beforeEach(() => {
		db.exec('DELETE FROM human; DELETE FROM company;');
		claude.answer.mockReset();
	});

	it('walks a human named by an email address, and says the name is missing', () => {
		const id = human('tara@ubs.com');
		human('Ada Lovelace');
		const next = nextToEnrich('human', 0)!;
		expect(next.id).toBe(id);
		expect(next.missing[0]).toBe('name');
		expect(nextToEnrich('human', id)!.missing).not.toContain('name');
	});

	it('asks for the name only when the human is known by email, and keeps it only then', async () => {
		const id = human('tara@ubs.com');
		const found = { first_name: 'Tara', family_name: 'Gleaves', reason: 'x', confidence: 'high' };
		claude.answer.mockResolvedValue({ name: found });
		const result = await enrichMember('human', id);
		expect(claude.answer.mock.calls[0][0].prompt).toContain('only by this email address');
		expect(result.emailOnly).toBe(true);
		expect(result.name?.familyName).toBe('Gleaves');

		const named = human('Ada Lovelace');
		const other = await enrichMember('human', named);
		expect(other.emailOnly).toBe(false);
		expect(other.name).toBeNull();
	});

	it('reports a human known by email with no name found, so deleting can be offered', async () => {
		claude.answer.mockResolvedValue({ name: NO_NAME });
		const result = await enrichMember('human', human('jarnoe@kpmg.dk'));
		expect(result.emailOnly).toBe(true);
		expect(result.name).toBeNull();
	});

	it('saves the chosen name as the display, first and family name', async () => {
		const id = human('tara@ubs.com');
		expect(await applyEnrichment('human', id, form({ name: 'Tara|Gleaves' }))).toBeUndefined();
		const saved = getHuman(id)!;
		expect([saved.human, saved.firstName, saved.familyName]).toEqual([
			'Tara Gleaves',
			'Tara',
			'Gleaves'
		]);
	});

	it('leaves the name alone when only a birthday is saved', async () => {
		const id = human('tara@ubs.com');
		expect(await applyEnrichment('human', id, form({ birthday: '1980-02-03' }))).toBeUndefined();
		expect(getHuman(id)!.human).toBe('tara@ubs.com');
		expect(getHuman(id)!.birthday).toBe('1980-02-03');
	});

	it('rejects an empty name and a name for a company', async () => {
		const id = human('tara@ubs.com');
		expect(await applyEnrichment('human', id, form({ name: ' | ' }))).toBe('The name is empty.');
		const company = createCompany({ company: 'UBS', website: '', notes: '' });
		expect(await applyEnrichment('company', company, form({ name: 'Tara|Gleaves' }))).toBe(
			'Only a human gets a name this way.'
		);
		expect(getHuman(id)!.human).toBe('tara@ubs.com');
	});
});

describe('finding pictures of a human', () => {
	beforeEach(() => {
		db.exec('DELETE FROM human_avatar; DELETE FROM human; DELETE FROM company;');
		claude.answer.mockReset();
		stubWeb();
	});

	it('keeps the pictures that download, by the address of the image itself', async () => {
		claude.answer.mockResolvedValue({
			pictures: [
				{ url: PNG, reason: 'own site', confidence: 'high' },
				{ url: PAGE, reason: 'about page', confidence: 'medium' },
				{ url: 'https://gone.example/x.png', reason: 'gone', confidence: 'high' }
			]
		});
		const result = await enrichMember('human', human('Ada Lovelace'));
		expect(result.pictures.map((p) => p.url)).toEqual([PNG, OG]);
	});

	it('looks for no pictures of a company', async () => {
		claude.answer.mockResolvedValue({ pictures: [{ url: PNG, reason: '', confidence: 'high' }] });
		const company = createCompany({ company: 'Acme', website: '', notes: '' });
		expect((await enrichMember('company', company)).pictures).toEqual([]);
	});

	it('saves the chosen pictures, and saves nothing when one cannot be downloaded', async () => {
		const id = human('Ada Lovelace');
		expect(await applyEnrichment('human', id, form({ picture: PNG }))).toBeUndefined();
		expect(listHumanAvatars(id).map((p) => p.sourceUrl)).toEqual([PNG]);

		const data = form({ picture: OG, birthday: '1815-12-10' });
		data.append('picture', 'https://gone.example/x.png');
		expect(await applyEnrichment('human', id, data)).toContain('Could not download a picture');
		expect(listHumanAvatars(id)).toHaveLength(1);
		expect(getHuman(id)!.birthday).toBe('');
	});

	it('rejects pictures for a company', async () => {
		const company = createCompany({ company: 'Acme', website: '', notes: '' });
		expect(await applyEnrichment('company', company, form({ picture: PNG }))).toBe(
			'Only a human gets pictures this way.'
		);
	});
});

describe('noticing a record filed as the wrong kind', () => {
	beforeEach(() => {
		db.exec('DELETE FROM human; DELETE FROM company;');
		claude.answer.mockReset();
	});

	it('says what moving the record keeps and drops', async () => {
		claude.answer.mockResolvedValue({
			kind: { kind: 'company', reason: 'A consultancy', confidence: 'medium' }
		});
		const { kind } = await enrichMember('human', human('Acme Consulting'));
		expect(kind?.kind).toBe('company');
		expect(kind?.keep).toContain('Name: Acme Consulting');
	});

	it('ignores the kind it already is, and a low-confidence guess', async () => {
		claude.answer.mockResolvedValue({ kind: { kind: 'human', reason: '', confidence: 'high' } });
		expect((await enrichMember('human', human('Ada Lovelace'))).kind).toBeNull();
		claude.answer.mockResolvedValue({ kind: { kind: 'company', reason: '', confidence: 'low' } });
		expect((await enrichMember('human', human('Grace Hopper'))).kind).toBeNull();
	});
});
