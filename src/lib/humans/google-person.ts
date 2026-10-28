import { formatDay, isE164, mapUrl, normalizePhone, displayName } from './details.ts';
import type { HumanContact } from './contact.ts';

type GoogleDate = { year?: number; month?: number; day?: number };

/** The parts of a People API `Person` the import reads. */
export type GooglePerson = {
	resourceName: string;
	names?: { displayName?: string; givenName?: string; middleName?: string; familyName?: string }[];
	nicknames?: { value?: string }[];
	addresses?: { formattedValue?: string; formattedType?: string; type?: string }[];
	phoneNumbers?: {
		value?: string;
		canonicalForm?: string;
		formattedType?: string;
		type?: string;
	}[];
	birthdays?: { date?: GoogleDate }[];
	events?: { date?: GoogleDate; formattedType?: string; type?: string }[];
	urls?: { value?: string }[];
	emailAddresses?: { value?: string }[];
	organizations?: { name?: string }[];
	photos?: { url?: string; default?: boolean; metadata?: { primary?: boolean } }[];
};

/** The contact's own photo, the primary one first; Google's generated letter pictures are skipped. */
export function personPhoto(person: GooglePerson): string | undefined {
	const photos = (person.photos ?? []).filter((p) => p.url && !p.default);
	return (photos.find((p) => p.metadata?.primary) ?? photos[0])?.url;
}

function day(date: GoogleDate | undefined): string | undefined {
	if (!date?.month || !date.day) return undefined;
	return formatDay(date.month, date.day, date.year);
}

function present<T>(value: T | undefined): value is T {
	return value !== undefined;
}

export type PersonPhone = { type: string; value: string };

/** The contact's numbers in international form, and the others as the contact has them written. */
function splitPhones(person: GooglePerson): { phones: PersonPhone[]; skipped: PersonPhone[] } {
	const phones: PersonPhone[] = [];
	const skipped: PersonPhone[] = [];
	for (const phone of person.phoneNumbers ?? []) {
		const type = phone.formattedType ?? phone.type ?? '';
		const value = normalizePhone(phone.canonicalForm ?? phone.value ?? '');
		if (isE164(value)) phones.push({ type, value });
		else if (phone.value) skipped.push({ type, value: phone.value });
	}
	return { phones, skipped };
}

/** The contact's numbers that have no country code, as written; a human cannot store these. */
export function nationalPhones(person: GooglePerson): PersonPhone[] {
	return splitPhones(person).skipped.filter(
		(phone) => !normalizePhone(phone.value).startsWith('+')
	);
}

/**
 * Maps a Google contact onto a human. Phone numbers Google could not put in international form
 * are returned in `skippedPhones`, since a human's numbers always carry a country code.
 */
export function personToContact(person: GooglePerson): {
	contact: HumanContact;
	skippedPhones: string[];
} {
	const name = person.names?.[0] ?? {};
	const firstName = name.givenName?.trim() ?? '';
	const middleNames = (name.middleName ?? '').split(/\s+/).filter(Boolean);
	const familyName = name.familyName?.trim() ?? '';
	const { phones, skipped } = splitPhones(person);
	const skippedPhones = skipped.map((phone) => phone.value);

	const uris = (person.urls ?? [])
		.map((url) => url.value?.trim())
		.filter((value): value is string => !!value && /^https?:\/\//i.test(value));

	return {
		contact: {
			human:
				name.displayName?.trim() ||
				displayName(firstName, middleNames, familyName) ||
				person.organizations?.find((o) => o.name?.trim())?.name?.trim() ||
				person.emailAddresses?.find((e) => e.value?.trim())?.value?.trim() ||
				person.phoneNumbers?.find((p) => p.value?.trim())?.value?.trim() ||
				person.resourceName,
			firstName,
			middleNames,
			familyName,
			birthday: day(person.birthdays?.find((b) => day(b.date))?.date) ?? '',
			nicknames: (person.nicknames ?? [])
				.map((n) => n.value?.trim())
				.filter((v): v is string => !!v)
				.map((value) => ({ type: '', value })),
			phones,
			addresses: (person.addresses ?? [])
				.filter((a) => a.formattedValue?.trim())
				.map((a) => {
					const value = a.formattedValue!.trim().replace(/\s*\n\s*/g, ', ');
					return { type: a.formattedType ?? a.type ?? '', value, mapUrl: mapUrl(value) };
				}),
			specialDays: (person.events ?? [])
				.map((event) => {
					const value = day(event.date);
					return value ? { type: event.formattedType ?? event.type ?? '', value } : undefined;
				})
				.filter(present),
			uris
		},
		skippedPhones
	};
}
