import { db } from '../db/index.ts';
import { listAccounts } from '../integrations/accounts.ts';
import { getOAuthClient } from '../integrations/clients.ts';
import { googleAccessToken } from '../integrations/google.ts';
import { readJson } from '../integrations/types.ts';
import { addReference, findReference, isBuried } from '../references/store.ts';
import { addSource } from '../sources/store.ts';
import type { HumanContact } from '#lib/humans/contact.ts';
import {
	nationalPhones,
	personPhoto,
	personToContact,
	type GooglePerson,
	type PersonPhone
} from '#lib/humans/google-person.ts';
import { createHuman, replaceDetails } from './store.ts';

const PEOPLE_API = 'https://people.googleapis.com/v1/';
const CONNECTIONS_URL = `${PEOPLE_API}people/me/connections`;
const PERSON_FIELDS =
	'names,nicknames,addresses,phoneNumbers,birthdays,events,urls,emailAddresses,organizations';

export type ImportResult = {
	created: number;
	/** Contacts already in the app as a human or company; they are left as they are. */
	existing: number;
	/** Contacts the user deleted from the app; they are not imported again. */
	deleted: number;
	/** Phone numbers of new contacts that had no country code. */
	skippedPhones: number;
};

async function fetchPeople(
	accessToken: string,
	personFields = PERSON_FIELDS
): Promise<GooglePerson[]> {
	const people: GooglePerson[] = [];
	let pageToken = '';
	do {
		const url = new URL(CONNECTIONS_URL);
		url.search = new URLSearchParams({
			personFields,
			pageSize: '1000',
			...(pageToken ? { pageToken } : {})
		}).toString();
		const page = await readJson(
			await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
			'Google Contacts'
		);
		people.push(...((page.connections as GooglePerson[] | undefined) ?? []));
		pageToken = (page.nextPageToken as string | undefined) ?? '';
	} while (pageToken);
	return people;
}

/** Adds a contact as a new human, linked to the contact by its People API resource name. */
const addContact = db.transaction((resourceName: string, contact: HumanContact) => {
	const humanId = createHuman(contact);
	addReference('GOOGLE_CONTACTS', resourceName, { humanId });
	replaceDetails(humanId, 'nickname', contact.nicknames);
	replaceDetails(humanId, 'phone', contact.phones);
	replaceDetails(humanId, 'address', contact.addresses);
	replaceDetails(humanId, 'specialDay', contact.specialDays);
	for (const uri of contact.uris) addSource({ humanId }, uri);
});

/** The photo URL of every contact that has a photo of its own, by People API resource name. */
export async function listContactPhotos(): Promise<Map<string, string>> {
	const people = await fetchPeople(await googleAccessToken('google', 'Google Contacts'), 'photos');
	const photos = new Map<string, string>();
	for (const person of people) {
		const url = personPhoto(person);
		if (url) photos.set(person.resourceName, url);
	}
	return photos;
}

/**
 * The numbers of one contact, by People API resource name, that have no country code and so could
 * not be imported.
 */
export async function contactNationalPhones(resourceName: string): Promise<PersonPhone[]> {
	if (!/^people\/[A-Za-z0-9]+$/.test(resourceName))
		throw new Error(`Not a Google Contacts resource name: ${resourceName}`);
	const url = new URL(resourceName, PEOPLE_API);
	url.search = new URLSearchParams({ personFields: 'phoneNumbers' }).toString();
	const accessToken = await googleAccessToken('google', 'Google Contacts');
	const person = await readJson(
		await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
		'Google Contacts'
	);
	return nationalPhones(person as GooglePerson);
}

export function isGoogleConnected(): boolean {
	return listAccounts().some((a) => a.platform === 'google') && !!getOAuthClient('google');
}

let running: Promise<ImportResult> | null = null;

/**
 * Adds the contacts that are not in the app yet. Contacts already imported, as a human or a
 * company, are never changed here, so edits made in the app are kept. A call while an import is in
 * progress joins that import.
 */
export function importGoogleContacts(): Promise<ImportResult> {
	running ??= (async () => {
		const people = await fetchPeople(await googleAccessToken('google', 'Google Contacts'));
		const result: ImportResult = { created: 0, existing: 0, deleted: 0, skippedPhones: 0 };
		for (const person of people) {
			if (findReference('GOOGLE_CONTACTS', person.resourceName)) {
				result.existing++;
				continue;
			}
			if (isBuried('GOOGLE_CONTACTS', person.resourceName)) {
				result.deleted++;
				continue;
			}
			const { contact, skippedPhones } = personToContact(person);
			addContact(person.resourceName, contact);
			result.created++;
			result.skippedPhones += skippedPhones.length;
		}
		return result;
	})().finally(() => {
		running = null;
	});
	return running;
}
