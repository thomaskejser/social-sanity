import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db, flag: Number, fromFlag: (v: number | null) => v === 1 }));

const {
	deleteHumanAvatar,
	getAvatar,
	getHumanAvatar,
	listHumanAvatars,
	moveAvatar,
	saveAvatar,
	showHumanAvatar
} = await import('./store.ts');
const { createHuman, deleteHuman } = await import('../humans/store.ts');
const { createCompany } = await import('../companies/store.ts');

const human = (name: string) =>
	createHuman({ human: name, firstName: '', middleNames: [], familyName: '', birthday: '' });
const picture = (text: string) => ({ contentType: 'image/png', image: Buffer.from(text) });
const shown = (owner: Parameters<typeof getAvatar>[0]) => getAvatar(owner)?.image.toString();
const sources = (humanId: number) => listHumanAvatars(humanId).map((p) => p.sourceUrl);

describe('human pictures', () => {
	beforeEach(() => db.exec('DELETE FROM human_avatar; DELETE FROM avatar; DELETE FROM human;'));

	it('keeps several pictures, shows the first, and skips one from a known address', () => {
		const ada = human('Ada');
		saveAvatar({ humanId: ada }, picture('one'), 'https://a/1.png');
		saveAvatar({ humanId: ada }, picture('two'), 'https://a/2.png');
		saveAvatar({ humanId: ada }, picture('again'), 'https://a/1.png');
		expect(sources(ada)).toEqual(['https://a/1.png', 'https://a/2.png']);
		expect(shown({ humanId: ada })).toBe('one');
	});

	it('shows the picture the user picks, and the next one when the shown one is removed', () => {
		const ada = human('Ada');
		saveAvatar({ humanId: ada }, picture('one'), 'https://a/1.png');
		saveAvatar({ humanId: ada }, picture('two'), 'https://a/2.png');
		const [first, second] = listHumanAvatars(ada);
		showHumanAvatar(ada, second.humanAvatarId);
		expect(shown({ humanId: ada })).toBe('two');
		deleteHumanAvatar(ada, second.humanAvatarId);
		expect(shown({ humanId: ada })).toBe('one');
		expect(getHumanAvatar(ada, first.humanAvatarId)?.image.toString()).toBe('one');
	});

	it('never shows or removes another human’s picture by its id', () => {
		const ada = human('Ada');
		const bob = human('Bob');
		saveAvatar({ humanId: ada }, picture('ada'), 'https://a/1.png');
		const [adas] = listHumanAvatars(ada);
		expect(getHumanAvatar(bob, adas.humanAvatarId)).toBeUndefined();
		deleteHumanAvatar(bob, adas.humanAvatarId);
		expect(sources(ada)).toHaveLength(1);
	});

	it('hands all pictures to the human a merge keeps, after its own', () => {
		const ada = human('Ada');
		const dup = human('Ada L');
		saveAvatar({ humanId: ada }, picture('ada'), 'https://a/1.png');
		saveAvatar({ humanId: dup }, picture('same'), 'https://a/1.png');
		saveAvatar({ humanId: dup }, picture('dup'), 'https://a/2.png');
		moveAvatar({ humanId: dup }, { humanId: ada });
		expect(sources(ada)).toEqual(['https://a/1.png', 'https://a/2.png']);
		expect(shown({ humanId: ada })).toBe('ada');
		deleteHuman(dup);
		expect(sources(ada)).toHaveLength(2);
	});

	it('gives a company made from a human the shown picture, and a human made from a company its one', () => {
		const ada = human('Ada');
		saveAvatar({ humanId: ada }, picture('one'), 'https://a/1.png');
		saveAvatar({ humanId: ada }, picture('two'), 'https://a/2.png');
		const company = createCompany({ company: 'Ada Ltd', website: '', notes: '' });
		moveAvatar({ humanId: ada }, { companyId: company });
		expect(shown({ companyId: company })).toBe('one');

		const bob = human('Bob');
		moveAvatar({ companyId: company }, { humanId: bob });
		expect(shown({ humanId: bob })).toBe('one');
		expect(getAvatar({ companyId: company })).toBeUndefined();
	});

	it('gives a company a single picture, replaced by the next', () => {
		const company = createCompany({ company: 'Acme', website: '', notes: '' });
		saveAvatar({ companyId: company }, picture('old'), 'https://c/1.png');
		saveAvatar({ companyId: company }, picture('new'), 'https://c/2.png');
		expect(shown({ companyId: company })).toBe('new');
		expect(db.prepare('SELECT COUNT(*) AS n FROM avatar').get()).toEqual({ n: 1 });
	});
});
