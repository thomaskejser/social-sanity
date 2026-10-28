import { describe, expect, it } from 'vitest';
import { nationalPhones, personPhoto, personToContact } from './google-person.ts';

describe('personToContact', () => {
	it('maps names, details and URLs', () => {
		const { contact, skippedPhones } = personToContact({
			resourceName: 'people/c1',
			names: [
				{
					displayName: 'Dr. Ada Lovelace',
					givenName: 'Ada',
					middleName: 'Augusta King',
					familyName: 'Lovelace'
				}
			],
			nicknames: [{ value: 'Countess' }],
			phoneNumbers: [
				{ value: '+45 12 34 56 78', canonicalForm: '+4512345678', formattedType: 'Mobile' },
				{ value: '12 34 56 78' }
			],
			addresses: [{ formattedValue: '1 Main St\nLondon', formattedType: 'Home' }],
			birthdays: [{ date: { month: 12, day: 10 } }],
			events: [{ date: { year: 1835, month: 7, day: 8 }, formattedType: 'Anniversary' }],
			urls: [{ value: 'https://ada.example.com' }, { value: 'not a url' }]
		});

		expect(contact.human).toBe('Dr. Ada Lovelace');
		expect(contact.middleNames).toEqual(['Augusta', 'King']);
		expect(contact.familyName).toBe('Lovelace');
		expect(contact.birthday).toBe('--12-10');
		expect(contact.nicknames).toEqual([{ type: '', value: 'Countess' }]);
		expect(contact.phones).toEqual([{ type: 'Mobile', value: '+4512345678' }]);
		expect(skippedPhones).toEqual(['12 34 56 78']);
		expect(contact.addresses[0].value).toBe('1 Main St, London');
		expect(contact.addresses[0].mapUrl).toContain('google.com/maps');
		expect(contact.specialDays).toEqual([{ type: 'Anniversary', value: '1835-07-08' }]);
		expect(contact.uris).toEqual(['https://ada.example.com']);
	});

	it('builds a display name when Google has none', () => {
		const { contact } = personToContact({
			resourceName: 'people/c2',
			names: [{ givenName: 'Grace', familyName: 'Hopper' }]
		});
		expect(contact.human).toBe('Grace Hopper');
	});

	it('names a contact without a name after its e-mail address', () => {
		const { contact } = personToContact({
			resourceName: 'people/c4',
			emailAddresses: [{ value: ' ' }, { value: 'grace@example.com' }]
		});
		expect(contact.human).toBe('grace@example.com');
	});

	it('prefers the company name, then any phone number', () => {
		expect(
			personToContact({
				resourceName: 'people/c5',
				organizations: [{ name: 'Dentist' }],
				emailAddresses: [{ value: 'desk@example.com' }]
			}).contact.human
		).toBe('Dentist');
		expect(
			personToContact({ resourceName: 'people/c6', phoneNumbers: [{ value: '12 34 56 78' }] })
				.contact.human
		).toBe('12 34 56 78');
	});

	it('falls back to the resource name for a contact without a name', () => {
		expect(personToContact({ resourceName: 'people/c3' }).contact.human).toBe('people/c3');
	});
});

describe('personPhoto', () => {
	it('prefers the primary photo the contact has', () => {
		expect(
			personPhoto({
				resourceName: 'people/1',
				photos: [
					{ url: 'https://lh3/other', metadata: {} },
					{ url: 'https://lh3/primary', metadata: { primary: true } }
				]
			})
		).toBe('https://lh3/primary');
	});

	it("skips Google's generated letter pictures", () => {
		expect(
			personPhoto({
				resourceName: 'people/1',
				photos: [{ url: 'https://lh3/letter', default: true, metadata: { primary: true } }]
			})
		).toBeUndefined();
		expect(personPhoto({ resourceName: 'people/2' })).toBeUndefined();
	});
});

describe('nationalPhones', () => {
	it('keeps only numbers without a country code, as written', () => {
		expect(
			nationalPhones({
				resourceName: 'people/c7',
				phoneNumbers: [
					{ value: '+45 12 34 56 78', canonicalForm: '+4512345678' },
					{ value: '020 7946 0018', formattedType: 'Work' },
					{ value: '+45 12' },
					{ value: '0045 12' },
					{ canonicalForm: '' }
				]
			})
		).toEqual([{ type: 'Work', value: '020 7946 0018' }]);
	});

	it('is empty for a contact without numbers', () => {
		expect(nationalPhones({ resourceName: 'people/c8' })).toEqual([]);
	});
});
