import { downloadAvatar, listHumanAvatars, saveAvatar, type Avatar } from '../avatars/store.ts';
import { askClaude, claudeErrorMessage, type ClaudeTask } from '../claude.ts';
import { getChannel } from '../channels/store.ts';
import { db } from '../db/index.ts';
import { addCompanyDetail, getCompany, listCompanyDetails } from '../companies/store.ts';
import { contactNationalPhones, isGoogleConnected } from '../humans/google-contacts.ts';
import { addDetail, getHuman, listDetails, middleNames, updateHuman } from '../humans/store.ts';
import { conversionPreview } from '../members/convert.ts';
import { listReferences, type MemberOwner } from '../references/store.ts';
import { addSocialAccount, listSocialAccounts } from '../social-accounts.ts';
import { pageImage } from '../sources/feed.ts';
import { fetchText } from '../sources/fetch.ts';
import { addSource, listSources, parseSourceUri } from '../sources/store.ts';
import { markEnriched } from './walk.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import { describeDay, mapUrl, parseDay, parseDetail } from '#lib/humans/details.ts';
import {
	isEmailName,
	parseEnrichment,
	type Enrichment,
	type Known,
	type NationalPhone,
	type PictureSuggestion
} from '#lib/humans/enrich.ts';
import { parseSocialAccount } from '#lib/social-accounts.ts';

const SYSTEM = `You help the user keep a personal contact list, so they can follow the people, companies and channels they care about without social media algorithms.
Given what the user knows about one person, company or channel, search the web for what it makes public about itself:
- for a person the user knows only by an email address: their real first and family name, from the address and its domain (for example a staff page, a public profile, a talk or a paper that shows the address or the name with the organisation). Report a name only when you are confident it belongs to this address,
- its social media accounts (LinkedIn, Instagram, X, Bluesky, Mastodon, Facebook, YouTube, GitHub, TikTok, Threads and similar),
- content it publishes: a website or blog, newsletter, podcast, or another page with an RSS or Atom feed,
- for a person: their birthday, only when they state it publicly themselves (for example on their own site or a public profile),
- for a person: pictures of them that could represent them in the user's contact list, such as the profile photo on their own site, a staff page or a public profile. Give the address of the image itself, or of a page whose preview picture is that photo. Only pictures clearly of this person, never a logo or a group photo,
- for a person or company: public places, such as the city they say they live or work in, or a company's office address. Never look for or report a private person's home address,
- for a company: its public main phone number, in international form with the country code. Never look for a private person's phone number.
A channel is a publication, show, community or account that is not one person or company; report only its social media accounts and content.
The user may have filed the record as the wrong kind: a person as a company, a company or brand as a person, or a channel as either. When what you find shows it is another kind, say so in kind; otherwise leave kind empty.
When the user lists phone numbers without a country code, propose the country calling code of each, judging from the addresses, the country codes of the other numbers, and the number's own length and format. This needs no web search. Leave a number out when nothing points to one country.
Only report what belongs to this specific person, company or channel. A namesake is worse than nothing, so when you cannot tell them apart from others with the same name, report nothing.
Leave out what the user already has.
When you are done searching, report your findings once, even when you found nothing.`;

const finding = {
	reason: {
		type: 'string',
		description: 'Short reason this belongs to them, with where you saw it.'
	},
	confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
} as const;

const REPORT: ClaudeTask['answer'] = {
	name: 'report_findings',
	description: 'Report what was found. Call once, at the end, even with empty lists.',
	schema: {
		type: 'object',
		properties: {
			identity: {
				type: 'string',
				description:
					'One sentence on who you believe this is (work, place), so the user can check the match. Empty if unsure.'
			},
			kind: {
				type: 'object',
				description:
					'What the record really is, only when it is not what the user filed it as; kind is empty when it fits.',
				properties: {
					kind: { type: 'string', enum: ['', 'human', 'company', 'channel'] },
					...finding
				},
				required: ['kind', 'reason', 'confidence'],
				additionalProperties: false
			},
			name: {
				type: 'object',
				description:
					'Only for a person the user knows by an email address alone: their real name. Both parts empty when unknown or not asked for.',
				properties: {
					first_name: { type: 'string' },
					family_name: { type: 'string' },
					...finding
				},
				required: ['first_name', 'family_name', 'reason', 'confidence'],
				additionalProperties: false
			},
			birthday: {
				type: 'object',
				description:
					'For a person only. value is YYYY-MM-DD, or --MM-DD when the year is not public; empty when unknown.',
				properties: { value: { type: 'string' }, ...finding },
				required: ['value', 'reason', 'confidence'],
				additionalProperties: false
			},
			places: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						type: { type: 'string', description: 'e.g. city, work, office' },
						address: { type: 'string' },
						...finding
					},
					required: ['type', 'address', 'reason', 'confidence'],
					additionalProperties: false
				}
			},
			phones: {
				type: 'array',
				description: 'For a company only: its public phone numbers.',
				items: {
					type: 'object',
					properties: {
						type: { type: 'string', description: 'e.g. office, support' },
						number: { type: 'string', description: 'International form, e.g. +45 70 10 20 30.' },
						...finding
					},
					required: ['type', 'number', 'reason', 'confidence'],
					additionalProperties: false
				}
			},
			phone_country_codes: {
				type: 'array',
				description: 'A country calling code for each listed number that has none.',
				items: {
					type: 'object',
					properties: {
						number: { type: 'string', description: 'The number exactly as the user listed it.' },
						calling_code: { type: 'string', description: 'Digits only, e.g. 45 for Denmark.' },
						...finding
					},
					required: ['number', 'calling_code', 'reason', 'confidence'],
					additionalProperties: false
				}
			},
			social_accounts: {
				type: 'array',
				items: {
					type: 'object',
					properties: { url: { type: 'string', description: 'Profile address.' }, ...finding },
					required: ['url', 'reason', 'confidence'],
					additionalProperties: false
				}
			},
			sources: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						uri: { type: 'string', description: 'Absolute https:// address.' },
						...finding
					},
					required: ['uri', 'reason', 'confidence'],
					additionalProperties: false
				}
			},
			pictures: {
				type: 'array',
				description: 'For a person only: pictures of them.',
				items: {
					type: 'object',
					properties: {
						url: {
							type: 'string',
							description:
								'https:// address of the image, or of a page whose preview picture is the photo.'
						},
						...finding
					},
					required: ['url', 'reason', 'confidence'],
					additionalProperties: false
				}
			}
		},
		required: [
			'identity',
			'kind',
			'name',
			'birthday',
			'places',
			'phones',
			'phone_country_codes',
			'social_accounts',
			'sources',
			'pictures'
		],
		additionalProperties: false
	}
};

function ownerOf(kind: MemberKind, id: number): MemberOwner {
	if (kind === 'human') return { humanId: id };
	if (kind === 'company') return { companyId: id };
	return { channelId: id };
}

function phonesOf(kind: MemberKind, id: number): string[] {
	if (kind === 'human') return listDetails(id, 'phone').map((d) => d.value);
	if (kind === 'company') return listCompanyDetails(id, 'phone').map((d) => d.value);
	return [];
}

function addressesOf(kind: MemberKind, id: number) {
	if (kind === 'human') return listDetails(id, 'address');
	if (kind === 'company') return listCompanyDetails(id, 'address');
	return [];
}

function known(kind: MemberKind, id: number): Known {
	const key = kind === 'human' ? 'humanId' : kind === 'company' ? 'companyId' : 'channelId';
	return {
		uris: listSources()
			.filter((s) => s[key] === id)
			.map((s) => s.contentSource),
		socialUrls: listSocialAccounts(kind, id).map((a) => a.url),
		addresses: addressesOf(kind, id).map((a) => a.value),
		birthday: kind === 'human' ? getHuman(id)!.birthday : '',
		phones: phonesOf(kind, id),
		pictureUrls: kind === 'human' ? listHumanAvatars(id).map((p) => p.sourceUrl) : []
	};
}

/**
 * The numbers of the record's Google contact that have no country code. A record not linked to
 * Google Contacts has none; when Google cannot be asked, `notice` says why.
 */
async function nationalPhonesOf(
	kind: MemberKind,
	id: number
): Promise<{ phones: NationalPhone[]; notice: string }> {
	if (kind === 'channel') return { phones: [], notice: '' };
	const contact = listReferences(ownerOf(kind, id)).find((r) => r.source === 'GOOGLE_CONTACTS');
	if (!contact) return { phones: [], notice: '' };
	if (!isGoogleConnected())
		return {
			phones: [],
			notice:
				'Connect Google Contacts under Integrations to complete phone numbers that have no country code.'
		};
	try {
		return { phones: await contactNationalPhones(contact.externalReference), notice: '' };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			phones: [],
			notice: `Could not read the phone numbers without a country code from Google Contacts: ${message}`
		};
	}
}

function describe(kind: MemberKind, id: number, have: Known, national: NationalPhone[]): string {
	const typed = (type: string) => (type ? ` (${type})` : '');
	const extra = [
		...addressesOf(kind, id).map((d) => `Address${typed(d.type)}: ${d.value}`),
		...(national.length ? have.phones.map((phone) => `Phone: ${phone}`) : []),
		...national.map((phone) => `Phone without a country code${typed(phone.type)}: ${phone.value}`),
		...have.socialUrls.map((url) => `Social account: ${url}`),
		...have.uris.map((uri) => `Known source: ${uri}`)
	];
	if (kind === 'channel') {
		const channel = getChannel(id)!;
		return [
			'A channel.',
			`Name: ${channel.channel}`,
			channel.website && `Website: ${channel.website}`,
			channel.notes && `Notes: ${channel.notes}`,
			...extra
		]
			.filter(Boolean)
			.join('\n');
	}
	if (kind === 'company') {
		const company = getCompany(id)!;
		return [
			'A company.',
			`Name: ${company.company}`,
			company.website && `Website: ${company.website}`,
			company.notes && `Notes: ${company.notes}`,
			...extra
		]
			.filter(Boolean)
			.join('\n');
	}
	const human = getHuman(id)!;
	return [
		'A person.',
		isEmailName(human.human)
			? `The user knows them only by this email address: ${human.human}. Find their name.`
			: `Display name: ${human.human}`,
		human.firstName && `First name: ${human.firstName}`,
		middleNames(id).length && `Middle names: ${middleNames(id).join(' ')}`,
		human.familyName && `Family name: ${human.familyName}`,
		human.birthday && `Birthday: ${describeDay(human.birthday)}`,
		...listDetails(id, 'nickname').map((d) => `Nickname: ${d.value}`),
		...extra
	]
		.filter(Boolean)
		.join('\n');
}

/** A suggested other kind, with what moving the record keeps and drops; null when it fits. */
function otherKind(kind: MemberKind, id: number, enrichment: Enrichment) {
	const suggestion = enrichment.kind;
	const preview = suggestion && conversionPreview(kind, id, suggestion.kind);
	return suggestion && preview ? { ...suggestion, ...preview } : null;
}

/** Drops what a record of `kind` cannot hold, or must not be looked up for. */
function fitToKind(kind: MemberKind, id: number, found: Enrichment): Enrichment {
	const enrichment = { ...found, kind: otherKind(kind, id, found) };
	if (kind === 'human') {
		const emailOnly = isEmailName(getHuman(id)!.human);
		return {
			...enrichment,
			name: emailOnly ? enrichment.name : null,
			emailOnly,
			phones: enrichment.phones.filter((phone) => phone.original)
		};
	}
	if (kind === 'company') return { ...enrichment, name: null, birthday: null, pictures: [] };
	return { ...enrichment, name: null, birthday: null, places: [], phones: [], pictures: [] };
}

/**
 * The address of the picture a suggestion points to: the address itself when it is an image, else
 * the preview picture of the page there. Undefined when neither gives a picture the app can keep.
 */
async function pictureAddress(url: string): Promise<string | undefined> {
	try {
		await downloadAvatar(url);
		return url;
	} catch {
		// Not an image itself; it may be a page with a preview picture.
	}
	try {
		const page = await fetchText(url);
		const image = pageImage(page.body, page.url);
		if (!image) return undefined;
		await downloadAvatar(image);
		return image;
	} catch {
		return undefined;
	}
}

/** The suggested pictures that can be downloaded, by the address of the image itself. */
async function resolvePictures(
	pictures: PictureSuggestion[],
	known: string[]
): Promise<PictureSuggestion[]> {
	const resolved: PictureSuggestion[] = [];
	for (const picture of pictures) {
		const url = await pictureAddress(picture.url);
		if (!url || known.includes(url) || resolved.some((p) => p.url === url)) continue;
		resolved.push({ ...picture, url });
	}
	return resolved;
}

/**
 * Asks Claude, with web search, what a human, company or channel makes public about itself, and
 * the country code of its Google contact's numbers that have none. Sends what the app knows about
 * it (names, birthday, nicknames, addresses, phone numbers when some lack a country code, accounts,
 * sources) to Claude. Suggested pictures are checked by downloading them. Nothing is saved, except
 * that the record is marked as looked up once Claude has answered.
 */
export async function enrichMember(kind: MemberKind, id: number): Promise<Enrichment> {
	const have = known(kind, id);
	const national = await nationalPhonesOf(kind, id);
	const answer = await askClaude({
		system: SYSTEM,
		prompt: `Find what they make public.\n\n${describe(kind, id, have, national.phones)}`,
		answer: REPORT,
		effort: 'medium',
		webSearches: 10,
		refusal: 'The AI declined this lookup.'
	});
	markEnriched(kind, id);
	const enrichment = fitToKind(kind, id, parseEnrichment(answer, have, national.phones));
	const pictures = await resolvePictures(enrichment.pictures, have.pictureUrls);
	return { ...enrichment, pictures, notice: national.notice };
}

/** Why a lookup failed, for the user; never throws. */
export function enrichErrorMessage(error: unknown): string {
	try {
		return claudeErrorMessage(error);
	} catch {
		return error instanceof Error ? error.message : String(error);
	}
}

function typedValues(form: FormData, name: string) {
	return form.getAll(name).map((value) => {
		const [type, ...rest] = String(value).split('|');
		return { type, value: rest.join('|').trim() };
	});
}

/**
 * Saves the findings the user ticked: `name` (`first|family`), `birthday`, and any number of `place`
 * and `phone` (`type|value`), `social`, `uri` and `picture` values. Pictures are downloaded first.
 * Rejects the whole form if any value is malformed, does not fit a record of `kind`, or is a
 * picture that cannot be downloaded.
 */
export async function applyEnrichment(
	kind: MemberKind,
	id: number,
	form: FormData
): Promise<string | undefined> {
	const [firstName = '', familyName = ''] = String(form.get('name') ?? '')
		.split('|')
		.map((part) => part.trim());
	const birthdayInput = String(form.get('birthday') ?? '');
	const birthday = birthdayInput ? parseDay(birthdayInput) : '';
	const places = typedValues(form, 'place');
	const phones = typedValues(form, 'phone').map((p) => parseDetail('phone', p.type, p.value));
	const socials = form.getAll('social').map((value) => parseSocialAccount(String(value)));
	const uris = form.getAll('uri').map((value) => parseSourceUri(String(value)));
	const pictureUrls = form.getAll('picture').map(String);

	if (form.has('name') && !firstName && !familyName) return 'The name is empty.';
	if (form.has('name') && kind !== 'human') return 'Only a human gets a name this way.';
	if (birthday === undefined) return 'The birthday is not a valid day.';
	if (birthday && kind !== 'human') return 'Only a human has a birthday.';
	if (places.some((p) => !p.value)) return 'One of the places is empty.';
	if (places.length && kind === 'channel') return 'A channel has no places.';
	if (phones.some((p) => !p.ok)) return 'One of the phone numbers is not valid.';
	if (phones.length && kind === 'channel') return 'A channel has no phone numbers.';
	if (socials.some((s) => !s)) return 'One of the social media addresses is not valid.';
	if (uris.some((u) => !u)) return 'One of the source addresses is not valid.';
	if (pictureUrls.length && kind !== 'human') return 'Only a human gets pictures this way.';

	const pictures: { url: string; avatar: Avatar }[] = [];
	for (const url of pictureUrls) {
		try {
			pictures.push({ url, avatar: await downloadAvatar(url) });
		} catch (error) {
			return `Could not download a picture: ${error instanceof Error ? error.message : String(error)}`;
		}
	}

	db.transaction(() => {
		saveFindings(kind, id, {
			name: { firstName, familyName },
			birthday,
			places,
			phones: phones.flatMap((p) => (p.ok ? [{ type: p.type, value: p.value }] : [])),
			socials: socials.map((s) => s!),
			uris: uris.map((u) => u!),
			pictures
		});
	})();
	return undefined;
}

function saveFindings(
	kind: MemberKind,
	id: number,
	{
		name,
		birthday,
		places,
		phones,
		socials,
		uris,
		pictures
	}: {
		name: { firstName: string; familyName: string };
		birthday: string;
		places: { type: string; value: string }[];
		phones: { type: string; value: string }[];
		socials: { platform: string; url: string }[];
		uris: string[];
		pictures: { url: string; avatar: Avatar }[];
	}
) {
	if (kind === 'human' && (birthday || name.firstName || name.familyName)) {
		const human = getHuman(id)!;
		const named = name.firstName || name.familyName;
		updateHuman(id, {
			...human,
			...(named && {
				human: [name.firstName, name.familyName].filter(Boolean).join(' '),
				firstName: name.firstName,
				familyName: name.familyName
			}),
			middleNames: middleNames(id),
			birthday: birthday || human.birthday
		});
	}
	for (const place of places) {
		const detail = { type: place.type, value: place.value, mapUrl: mapUrl(place.value) };
		if (kind === 'human') addDetail(id, 'address', detail);
		else addCompanyDetail(id, 'address', detail);
	}
	for (const phone of phones) {
		if (kind === 'human') addDetail(id, 'phone', phone);
		else addCompanyDetail(id, 'phone', phone);
	}
	for (const social of socials) addSocialAccount(kind, id, social);
	for (const uri of uris) addSource(ownerOf(kind, id), uri);
	for (const picture of pictures) saveAvatar(ownerOf(kind, id), picture.avatar, picture.url);
}
