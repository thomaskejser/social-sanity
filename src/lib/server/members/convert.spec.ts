import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db, flag: Number, fromFlag: (v: number | null) => v === 1 }));

const { conversionPreview, convertMember, mergeMembers } = await import('./convert.ts');
const humans = await import('../humans/store.ts');
const companies = await import('../companies/store.ts');
const channels = await import('../channels/store.ts');
const { addReference, findReference, isBuried } = await import('../references/store.ts');
const { addSource, listSources } = await import('../sources/store.ts');
const { addSocialAccount, listSocialAccounts } = await import('../social-accounts.ts');

function human(name: string) {
	const id = humans.createHuman({
		human: name,
		firstName: 'Ada',
		middleNames: [],
		familyName: 'Lovelace',
		birthday: '1815-12-10'
	});
	humans.setHumanKudos(id, 7);
	humans.addDetail(id, 'phone', { type: 'work', value: '+4512345678' });
	return id;
}

function groupWith(add: (groupId: number) => void) {
	const name = `G${Math.random()}`;
	humans.createGroup(name);
	const group = humans.listGroups().find((g) => g.humanGroup === name)!;
	add(group.humanGroupId);
	return group.humanGroupId;
}

describe('convertMember', () => {
	it('turns a human into a company, keeping what companies hold', () => {
		const id = human('Ada Lovelace');
		const groupId = groupWith((g) => humans.addMember(g, id));
		addSource({ humanId: id }, 'https://ada.example/feed');
		addSocialAccount('human', id, { platform: 'github', url: 'https://github.com/ada' });
		addReference('GOOGLE_CONTACTS', 'people/ada', { humanId: id });

		const companyId = convertMember('human', id, 'company');

		expect(humans.getHuman(id)).toBeUndefined();
		expect(companies.getCompany(companyId)).toMatchObject({ company: 'Ada Lovelace', kudos: 7 });
		expect(companies.listCompanyDetails(companyId, 'phone')[0].value).toBe('+4512345678');
		expect(
			humans
				.listGroups()
				.find((g) => g.humanGroupId === groupId)
				?.members.map(({ kind, id, name }) => ({ kind, id, name }))
		).toEqual([{ kind: 'company', id: companyId, name: 'Ada Lovelace' }]);
		expect(
			listSources().find((s) => s.contentSource === 'https://ada.example/feed')?.companyId
		).toBe(companyId);
		expect(listSocialAccounts('company', companyId)).toHaveLength(1);
		expect(findReference('GOOGLE_CONTACTS', 'people/ada')).toEqual({ companyId });
		expect(isBuried('GOOGLE_CONTACTS', 'people/ada')).toBe(false);
	});

	it('turns a company into a channel, keeping website and notes but not phones', () => {
		const id = companies.createCompany({
			company: 'Acme',
			website: 'https://acme.example/',
			notes: 'n'
		});
		companies.addCompanyDetail(id, 'phone', { type: '', value: '+4511111111' });
		expect(conversionPreview('company', id, 'channel')?.strip).toEqual(['1 phone number']);

		const channelId = convertMember('company', id, 'channel');
		expect(channels.getChannel(channelId)).toMatchObject({
			channel: 'Acme',
			website: 'https://acme.example/',
			notes: 'n'
		});
	});

	it('turns a channel into a human and back, keeping the YouTube link', () => {
		const id = channels.createChannel({
			channel: 'Toy Poodle Fun',
			website: 'https://x.example/',
			notes: ''
		});
		addReference('YOUTUBE', 'UC1', { channelId: id });
		expect(conversionPreview('channel', id, 'human')?.strip).toEqual([
			'Website: https://x.example/'
		]);

		const humanId = convertMember('channel', id, 'human');
		expect(findReference('YOUTUBE', 'UC1')).toEqual({ humanId });
		const channelId = convertMember('human', humanId, 'channel');
		expect(findReference('YOUTUBE', 'UC1')).toEqual({ channelId });
	});

	it('lists what a human loses on becoming a channel', () => {
		const id = human('Grace Hopper');
		expect(conversionPreview('human', id, 'channel')?.strip).toEqual([
			'First name: Ada',
			'Family name: Lovelace',
			'Birthday',
			'1 phone number'
		]);
	});

	it('refuses to convert to the same kind or a missing record', () => {
		expect(conversionPreview('human', 9999, 'company')).toBeUndefined();
		const id = human('Same');
		expect(conversionPreview('human', id, 'human')).toBeUndefined();
	});
});

describe('mergeMembers', () => {
	it('keeps the target and adds what only the other one had', () => {
		const keep = humans.createHuman({
			human: 'Ada Lovelace',
			firstName: '',
			middleNames: [],
			familyName: '',
			birthday: ''
		});
		const drop = human('ada');
		humans.setHumanKudos(keep, 2);
		const groupId = groupWith((g) => humans.addMember(g, drop));
		addSource({ humanId: drop }, 'https://medium.com/feed/@ada');
		addSource({ humanId: keep }, 'https://medium.com/feed/@ada');
		addSource({ humanId: drop }, 'https://ada.blog/feed');
		addReference('YOUTUBE', 'UCada', { humanId: drop });

		mergeMembers('human', drop, keep);

		expect(humans.getHuman(drop)).toBeUndefined();
		expect(humans.getHuman(keep)).toMatchObject({
			human: 'Ada Lovelace',
			firstName: 'Ada',
			familyName: 'Lovelace',
			birthday: '1815-12-10',
			kudos: 7
		});
		expect(humans.listDetails(keep, 'phone').map((d) => d.value)).toEqual(['+4512345678']);
		expect(
			humans
				.listGroups()
				.find((g) => g.humanGroupId === groupId)
				?.members.map((m) => m.id)
		).toEqual([keep]);
		expect(
			listSources()
				.filter((s) => s.humanId === keep)
				.map((s) => s.contentSource)
				.sort()
		).toEqual(['https://ada.blog/feed', 'https://medium.com/feed/@ada']);
		expect(findReference('YOUTUBE', 'UCada')).toEqual({ humanId: keep });
		expect(isBuried('YOUTUBE', 'UCada')).toBe(false);
	});

	it('does not repeat phone numbers both have, and refuses unknown records', () => {
		const a = human('A');
		const b = human('B');
		mergeMembers('human', b, a);
		expect(humans.listDetails(a, 'phone')).toHaveLength(1);
		expect(() => mergeMembers('human', 99999, a)).toThrow();
	});
});
