import { describe, expect, it } from 'vitest';
import { isEmailName, isEmptyEnrichment, parseEnrichment, type Known } from './enrich.ts';

const NOTHING: Known = {
	uris: [],
	socialUrls: [],
	addresses: [],
	birthday: '',
	phones: [],
	pictureUrls: []
};

describe('parseEnrichment', () => {
	it('keeps new sources, ordered by confidence', () => {
		const result = parseEnrichment(
			{
				identity: 'Ada Lovelace, mathematician in London',
				sources: [
					{ uri: 'https://ada.example.com/feed', reason: 'Her blog', confidence: 'low' },
					{ uri: 'https://ada.example.org', reason: 'Talks', confidence: 'high' }
				]
			},
			NOTHING
		);
		expect(result.identity).toBe('Ada Lovelace, mathematician in London');
		expect(result.sources.map((s) => s.uri)).toEqual([
			'https://ada.example.org/',
			'https://ada.example.com/feed'
		]);
	});

	it('drops known, duplicate and unsafe sources', () => {
		const result = parseEnrichment(
			{
				sources: [
					{ uri: 'https://ada.example.com', confidence: 'high' },
					{ uri: 'https://ada.example.com/', confidence: 'high' },
					{ uri: 'javascript:alert(1)', confidence: 'high' },
					{ uri: 'not a url', confidence: 'high' },
					{ uri: 'https://known.example.com', confidence: 'high' }
				]
			},
			{ ...NOTHING, uris: ['https://known.example.com/'] }
		);
		expect(result.sources.map((s) => s.uri)).toEqual(['https://ada.example.com/']);
	});

	it('keeps social accounts only on known platforms, and not already linked ones', () => {
		const result = parseEnrichment(
			{
				social_accounts: [
					{ url: 'https://www.linkedin.com/in/ada', reason: 'Profile', confidence: 'high' },
					{ url: 'https://hachyderm.io/@ada', confidence: 'medium' },
					{ url: 'https://ada.example.com', confidence: 'high' },
					{ url: 'https://x.com/ada', confidence: 'high' }
				]
			},
			{ ...NOTHING, socialUrls: ['https://x.com/ada'] }
		);
		expect(result.socialAccounts.map((a) => [a.platform, a.url])).toEqual([
			['linkedin', 'https://www.linkedin.com/in/ada'],
			['mastodon', 'https://hachyderm.io/@ada']
		]);
	});

	it('validates the birthday and skips one already known', () => {
		expect(
			parseEnrichment({ birthday: { value: '--12-10', confidence: 'high' } }, NOTHING).birthday
		).toEqual({ value: '--12-10', reason: '', confidence: 'high' });
		expect(parseEnrichment({ birthday: { value: 'December 10' } }, NOTHING).birthday).toBeNull();
		expect(
			parseEnrichment({ birthday: { value: '1815-12-10' } }, { ...NOTHING, birthday: '1815-12-10' })
				.birthday
		).toBeNull();
	});

	it('keeps new places and treats an unknown confidence as low', () => {
		const result = parseEnrichment(
			{
				places: [
					{ type: 'city', address: 'London', confidence: '?' },
					{ type: 'work', address: 'Known Street 1' }
				]
			},
			{ ...NOTHING, addresses: ['known street 1'] }
		);
		expect(result.places).toEqual([
			{ type: 'city', address: 'London', reason: '', confidence: 'low' }
		]);
	});

	it('applies a proposed country code to a number the user has without one', () => {
		const result = parseEnrichment(
			{
				phone_country_codes: [
					{ number: '020 7946 0018', calling_code: '44', reason: 'London address' },
					{ number: '12345678', calling_code: '+45', reason: 'Other numbers', confidence: 'high' }
				]
			},
			NOTHING,
			[
				{ type: 'Work', value: '020 7946 0018' },
				{ type: 'Mobile', value: '12 34 56 78' }
			]
		);
		expect(result.phones).toEqual([
			{
				type: 'Mobile',
				value: '+4512345678',
				original: '12 34 56 78',
				reason: 'Other numbers',
				confidence: 'high'
			},
			{
				type: 'Work',
				value: '+442079460018',
				original: '020 7946 0018',
				reason: 'London address',
				confidence: 'low'
			}
		]);
		expect(isEmptyEnrichment(result)).toBe(false);
	});

	it('drops country codes for numbers it was not asked about, bad codes and known numbers', () => {
		const result = parseEnrichment(
			{
				phone_country_codes: [
					{ number: '99 99 99 99', calling_code: '45' },
					{ number: '12 34 56 78', calling_code: 'DK' },
					{ number: '87 65 43 21', calling_code: '45' }
				]
			},
			{ ...NOTHING, phones: ['+4587654321'] },
			[
				{ type: '', value: '12 34 56 78' },
				{ type: '', value: '87 65 43 21' }
			]
		);
		expect(result.phones).toEqual([]);
	});

	it('keeps public numbers in international form only', () => {
		const result = parseEnrichment(
			{
				phones: [
					{ type: 'office', number: '+45 70 10 20 30', confidence: 'high' },
					{ type: 'office', number: '70 10 20 30', confidence: 'high' },
					{ type: 'support', number: '+4570102030', confidence: 'high' }
				]
			},
			NOTHING
		);
		expect(result.phones.map((p) => [p.type, p.value, p.original])).toEqual([
			['office', '+4570102030', '']
		]);
	});

	it('keeps https pictures not already kept, at most six', () => {
		const pictures = [
			{ url: 'https://a.example/me.jpg', reason: 'own site', confidence: 'high' },
			{ url: 'https://a.example/me.jpg', reason: 'again', confidence: 'high' },
			{ url: 'http://b.example/me.jpg', reason: 'insecure', confidence: 'high' },
			{ url: 'https://known.example/me.jpg', reason: 'kept', confidence: 'high' },
			...Array.from({ length: 8 }, (_, i) => ({
				url: `https://c.example/${i}.jpg`,
				reason: '',
				confidence: 'low'
			}))
		];
		const result = parseEnrichment(
			{ pictures },
			{
				...NOTHING,
				pictureUrls: ['https://known.example/me.jpg']
			}
		);
		expect(result.pictures[0].url).toBe('https://a.example/me.jpg');
		expect(result.pictures).toHaveLength(6);
		expect(result.pictures.some((p) => !p.url.startsWith('https://'))).toBe(false);
		expect(isEmptyEnrichment(result)).toBe(false);
	});

	it('tolerates missing fields', () => {
		const result = parseEnrichment(undefined, NOTHING);
		expect(isEmptyEnrichment(result)).toBe(true);
		expect(result.identity).toBe('');
	});

	it('keeps a found name, and drops one that is an email address', () => {
		const found = parseEnrichment(
			{
				name: {
					first_name: ' Tara ',
					family_name: 'Gleaves',
					reason: 'UBS page',
					confidence: 'high'
				}
			},
			NOTHING
		);
		expect(found.name).toEqual({
			firstName: 'Tara',
			familyName: 'Gleaves',
			reason: 'UBS page',
			confidence: 'high'
		});
		expect(isEmptyEnrichment(found)).toBe(false);
		const email = parseEnrichment(
			{ name: { first_name: 'tara@ubs.com', family_name: '', reason: '', confidence: 'high' } },
			NOTHING
		);
		expect(email.name).toBeNull();
		expect(parseEnrichment({ name: { first_name: '', family_name: '' } }, NOTHING).name).toBeNull();
	});
});

describe('isEmailName', () => {
	it('tells an email address from a name', () => {
		expect(isEmailName('Tara.Gleaves@ubs.com')).toBe(true);
		expect(isEmailName(' jarnoe@kpmg.dk ')).toBe(true);
		expect(isEmailName('Marcella McKeown (Marcella.McKeown@sqlpass.org)')).toBe(false);
		expect(isEmailName('Ada Lovelace')).toBe(false);
		expect(isEmailName('@ada')).toBe(false);
	});
});
