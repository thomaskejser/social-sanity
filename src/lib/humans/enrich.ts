import { isE164, normalizePhone, parseDay, withCallingCode } from './details.ts';
import { isMemberKind, type MemberKind } from '../groups/member.ts';
import { parseSocialAccount, type SocialPlatform } from '../social-accounts.ts';

export type Confidence = 'high' | 'medium' | 'low';

type Suggested = { reason: string; confidence: Confidence };

export type SourceSuggestion = Suggested & { uri: string };
export type SocialSuggestion = Suggested & { url: string; platform: SocialPlatform };
export type PlaceSuggestion = Suggested & { type: string; address: string };
export type BirthdaySuggestion = Suggested & { value: string };
export type NameSuggestion = Suggested & { firstName: string; familyName: string };
/** `url` is the https address of the picture itself. */
export type PictureSuggestion = Suggested & { url: string };
/**
 * That the record is really another kind, e.g. a person filed as a company. `keep` and `strip` say
 * what moving it keeps and drops; the server fills them in.
 */
export type KindSuggestion = Suggested & { kind: MemberKind; keep: string[]; strip: string[] };
export type PhoneSuggestion = Suggested & {
	type: string;
	/** E.164. */
	value: string;
	/** The number as the contact has it, without a country code; empty when found on the web. */
	original: string;
};

/** A number the user has without a country code, as written. */
export type NationalPhone = { type: string; value: string };

export type Enrichment = {
	/** Claude's one-line description of who it believes this is, so the user can judge the match. */
	identity: string;
	/** A person's real name, only looked for when the app knows them by an email address alone. */
	name: NameSuggestion | null;
	/** Whether the app knows them by an email address alone; with no `name`, deleting is offered. */
	emailOnly: boolean;
	/** `YYYY-MM-DD` or `--MM-DD`; only for humans, and only when the person states it publicly. */
	birthday: BirthdaySuggestion | null;
	/** Public places such as a city or workplace; never a private home address. */
	places: PlaceSuggestion[];
	socialAccounts: SocialSuggestion[];
	sources: SourceSuggestion[];
	/** Country codes proposed for numbers without one, and a company's public numbers. */
	phones: PhoneSuggestion[];
	/** Pictures of a human that could represent them. */
	pictures: PictureSuggestion[];
	/** Set when the AI thinks the record is another kind than the user filed it as. */
	kind: KindSuggestion | null;
	/** Something the user should know about the lookup, e.g. that a part of it could not run. */
	notice: string;
};

/** What the human or company already has, so suggestions repeat none of it. */
export type Known = {
	uris: string[];
	socialUrls: string[];
	addresses: string[];
	birthday: string;
	/** E.164. */
	phones: string[];
	/** Where the human's pictures were downloaded from. */
	pictureUrls: string[];
};

const CONFIDENCE: Confidence[] = ['high', 'medium', 'low'];

/** At most this many pictures are suggested per lookup. */
const MAX_PICTURES = 6;

/** Whether a display name is an email address rather than a name, e.g. "ada@example.com". */
export function isEmailName(name: string): boolean {
	return /^[^\s@]+@[^\s@]+$/.test(name.trim());
}

function normalizeUri(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function suggested(item: Record<string, unknown>): Suggested {
	return {
		reason: text(item.reason),
		confidence: CONFIDENCE.includes(item.confidence as Confidence)
			? (item.confidence as Confidence)
			: 'low'
	};
}

function records(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) ? value.map((item) => (item ?? {}) as Record<string, unknown>) : [];
}

function byConfidence<T extends Suggested>(items: T[]): T[] {
	return items.sort((a, b) => CONFIDENCE.indexOf(a.confidence) - CONFIDENCE.indexOf(b.confidence));
}

/**
 * Reads the `report_findings` tool input. Anything malformed, unsafe or already known is dropped;
 * the rest is ordered by confidence. Social accounts must be on a platform the app knows; other
 * web addresses belong in `sources`. A proposed country code is only kept for one of
 * `nationalPhones`, and only when it makes a valid number.
 */
export function parseEnrichment(
	input: unknown,
	known: Known,
	nationalPhones: NationalPhone[] = []
): Enrichment {
	const record = (input ?? {}) as Record<string, unknown>;
	const knownUris = new Set(known.uris.map((uri) => normalizeUri(uri) ?? uri));
	const knownSocial = new Set(known.socialUrls.map((url) => normalizeUri(url) ?? url));
	const knownAddresses = new Set(known.addresses.map((a) => a.toLowerCase()));

	const sources: SourceSuggestion[] = [];
	for (const item of records(record.sources)) {
		const uri = normalizeUri(item.uri);
		if (!uri || knownUris.has(uri) || sources.some((s) => s.uri === uri)) continue;
		sources.push({ uri, ...suggested(item) });
	}

	const socialAccounts: SocialSuggestion[] = [];
	for (const item of records(record.social_accounts)) {
		const account = parseSocialAccount(text(item.url));
		if (!account || knownSocial.has(account.url)) continue;
		if (socialAccounts.some((s) => s.url === account.url)) continue;
		socialAccounts.push({ ...account, ...suggested(item) });
	}

	const places: PlaceSuggestion[] = [];
	for (const item of records(record.places)) {
		const address = text(item.address);
		if (!address || knownAddresses.has(address.toLowerCase())) continue;
		places.push({ type: text(item.type), address, ...suggested(item) });
	}

	const knownPictures = new Set(known.pictureUrls);
	const pictures: PictureSuggestion[] = [];
	for (const item of records(record.pictures)) {
		const url = normalizeUri(item.url);
		if (!url?.startsWith('https://') || knownPictures.has(url)) continue;
		if (pictures.some((p) => p.url === url)) continue;
		pictures.push({ url, ...suggested(item) });
	}

	const kindRecord = (record.kind ?? {}) as Record<string, unknown>;
	const kindGuess = suggested(kindRecord);
	const kind =
		isMemberKind(kindRecord.kind) && kindGuess.confidence !== 'low'
			? { kind: kindRecord.kind, ...kindGuess, keep: [], strip: [] }
			: null;

	const birthdayRecord = (record.birthday ?? {}) as Record<string, unknown>;
	const day = parseDay(text(birthdayRecord.value));
	const birthday =
		day && day !== known.birthday ? { value: day, ...suggested(birthdayRecord) } : null;

	const nameRecord = (record.name ?? {}) as Record<string, unknown>;
	const firstName = text(nameRecord.first_name);
	const familyName = text(nameRecord.family_name);
	const name =
		(firstName || familyName) && ![firstName, familyName].some(isEmailName)
			? { firstName, familyName, ...suggested(nameRecord) }
			: null;

	return {
		identity: text(record.identity),
		name,
		emailOnly: false,
		birthday,
		places: byConfidence(places),
		socialAccounts: byConfidence(socialAccounts),
		sources: byConfidence(sources),
		phones: byConfidence(parsePhones(record, known, nationalPhones)),
		pictures: byConfidence(pictures).slice(0, MAX_PICTURES),
		kind,
		notice: ''
	};
}

function parsePhones(
	record: Record<string, unknown>,
	known: Known,
	nationalPhones: NationalPhone[]
): PhoneSuggestion[] {
	const phones: PhoneSuggestion[] = [];
	const add = (phone: PhoneSuggestion) => {
		if (known.phones.includes(phone.value) || phones.some((p) => p.value === phone.value)) return;
		phones.push(phone);
	};
	for (const item of records(record.phone_country_codes)) {
		const number = normalizePhone(text(item.number));
		const national = nationalPhones.find((p) => normalizePhone(p.value) === number);
		const value = national && withCallingCode(national.value, text(item.calling_code));
		if (!national || !value) continue;
		add({ type: national.type, value, original: national.value, ...suggested(item) });
	}
	for (const item of records(record.phones)) {
		const value = normalizePhone(text(item.number));
		if (!isE164(value)) continue;
		add({ type: text(item.type), value, original: '', ...suggested(item) });
	}
	return phones;
}

export function isEmptyEnrichment(enrichment: Enrichment): boolean {
	return (
		!enrichment.name &&
		!enrichment.birthday &&
		!enrichment.places.length &&
		!enrichment.socialAccounts.length &&
		!enrichment.sources.length &&
		!enrichment.phones.length &&
		!enrichment.pictures.length
	);
}
