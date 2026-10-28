import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db }));

const { addReference, findReference, isBuried } = await import('./store.ts');
const { createHuman, deleteHuman } = await import('../humans/store.ts');
const { createCompany, deleteCompany } = await import('../companies/store.ts');
const { convertMember } = await import('../members/convert.ts');

const human = (name: string) =>
	createHuman({ human: name, firstName: '', middleNames: [], familyName: '', birthday: '' });

describe('tombstones', () => {
	it('keeps the outside IDs of a deleted human, so imports skip them', () => {
		const humanId = human('Ada Lovelace');
		addReference('GOOGLE_CONTACTS', 'people/1', { humanId });
		addReference('YOUTUBE', 'UC1', { humanId });

		deleteHuman(humanId);

		expect(findReference('GOOGLE_CONTACTS', 'people/1')).toBeUndefined();
		expect(isBuried('GOOGLE_CONTACTS', 'people/1')).toBe(true);
		expect(isBuried('YOUTUBE', 'UC1')).toBe(true);
		expect(
			db
				.prepare('SELECT external_reference_tombstone AS name FROM external_reference_tombstone')
				.all()
		).toEqual([{ name: 'Ada Lovelace' }, { name: 'Ada Lovelace' }]);
	});

	it('does the same for a deleted company', () => {
		const companyId = createCompany({ company: 'Acme', website: '', notes: '' });
		addReference('YOUTUBE', 'UC2', { companyId });
		deleteCompany(companyId);
		expect(isBuried('YOUTUBE', 'UC2')).toBe(true);
	});

	it('leaves no tombstone when a human becomes a company', () => {
		const humanId = human('Grace Hopper');
		addReference('GOOGLE_CONTACTS', 'people/2', { humanId });
		const companyId = convertMember('human', humanId, 'company');
		expect(isBuried('GOOGLE_CONTACTS', 'people/2')).toBe(false);
		expect(findReference('GOOGLE_CONTACTS', 'people/2')).toEqual({ companyId });
	});

	it('does not bury IDs of other records', () => {
		const keep = human('Keep');
		const drop = human('Drop');
		addReference('GOOGLE_CONTACTS', 'people/keep', { humanId: keep });
		deleteHuman(drop);
		expect(isBuried('GOOGLE_CONTACTS', 'people/keep')).toBe(false);
	});
});
