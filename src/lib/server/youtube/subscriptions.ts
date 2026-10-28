import { askClaude, claudeErrorMessage, claudeReady, type ClaudeTask } from '../claude.ts';
import { createChannel, findChannelByName } from '../channels/store.ts';
import { createCompany, findCompanyByName } from '../companies/store.ts';
import { db } from '../db/index.ts';
import { createHuman, findHumanByName } from '../humans/store.ts';
import { listAccounts } from '../integrations/accounts.ts';
import { getOAuthClient } from '../integrations/clients.ts';
import { googleAccessToken } from '../integrations/google.ts';
import { readJson } from '../integrations/types.ts';
import { addReference, findReference, isBuried, type ReferenceOwner } from '../references/store.ts';
import { addSocialAccount } from '../social-accounts.ts';
import { addSource } from '../sources/store.ts';
import {
	channelFeedUrl,
	channelUrl,
	parseClassification,
	type ChannelKind
} from '#lib/youtube/classify.ts';
import saveChannelSql from './sql/save-channel.sql?raw';
import listChannelIdsSql from './sql/list-channel-ids.sql?raw';
import listChannelsSql from './sql/list-channels.sql?raw';
import countChannelsSql from './sql/count-channels.sql?raw';
import listUnclassifiedSql from './sql/list-unclassified.sql?raw';
import saveSuggestionSql from './sql/save-suggestion.sql?raw';
import getChannelSql from './sql/get-channel.sql?raw';
import markAddedSql from './sql/mark-added.sql?raw';
import listSortedSql from './sql/list-sorted.sql?raw';

const SUBSCRIPTIONS_URL = 'https://www.googleapis.com/youtube/v3/subscriptions';
/** Channels sent to Claude per request. */
const BATCH = 40;

/**
 * An imported channel. Once added, it shows the human, company or channel that holds its YouTube
 * reference now, so it follows the record when the user turns a human into a company.
 */
export type YouTubeChannel = {
	youtubeChannelId: number;
	channelId: string;
	youtubeChannel: string;
	thumbnailUrl: string;
	suggestionReason: string;
	addedAt: number | null;
	humanId: number | null;
	human: string | null;
	companyId: number | null;
	company: string | null;
	appChannelId: number | null;
	appChannel: string | null;
};

export type ChannelCounts = { imported: number; waiting: number; added: number };

const statements = {
	save: db.prepare(saveChannelSql),
	listIds: db.prepare<[], { channelId: string }>(listChannelIdsSql),
	list: db.prepare<[{ limit: number; offset: number }], YouTubeChannel>(listChannelsSql),
	count: db.prepare<[], ChannelCounts>(countChannelsSql),
	listUnclassified: db.prepare<
		[{ limit: number }],
		{ youtubeChannelId: number; youtubeChannel: string; description: string }
	>(listUnclassifiedSql),
	saveSuggestion: db.prepare(saveSuggestionSql),
	get: db.prepare<
		[{ youtube_channel_id: number }],
		{ youtubeChannelId: number; channelId: string; youtubeChannel: string; addedAt: number | null }
	>(getChannelSql),
	markAdded: db.prepare(markAddedSql),
	listSorted: db.prepare<[], ChannelChoice>(listSortedSql)
};

export function isYouTubeConnected(): boolean {
	return listAccounts().some((a) => a.platform === 'youtube') && !!getOAuthClient('youtube');
}

export function listChannels(limit: number, offset: number): YouTubeChannel[] {
	return statements.list.all({ limit, offset });
}

export function countChannels(): ChannelCounts {
	return statements.count.get()!;
}

type Subscription = {
	snippet?: {
		title?: string;
		description?: string;
		resourceId?: { channelId?: string };
		thumbnails?: { default?: { url?: string } };
	};
};

/** Reads every channel the YouTube account subscribes to into the review list. */
export async function fetchSubscriptions(
	now = Date.now()
): Promise<{ total: number; new: number }> {
	const token = await googleAccessToken('youtube', 'YouTube');
	const known = new Set(statements.listIds.all().map((row) => row.channelId));
	const subscriptions: Subscription[] = [];
	let pageToken = '';
	do {
		const url = new URL(SUBSCRIPTIONS_URL);
		url.search = new URLSearchParams({
			part: 'snippet',
			mine: 'true',
			maxResults: '50',
			...(pageToken ? { pageToken } : {})
		}).toString();
		const page = await readJson(
			await fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
			'YouTube subscriptions'
		);
		subscriptions.push(...((page.items as Subscription[] | undefined) ?? []));
		pageToken = (page.nextPageToken as string | undefined) ?? '';
	} while (pageToken);

	let fresh = 0;
	db.transaction(() => {
		for (const { snippet } of subscriptions) {
			const channelId = snippet?.resourceId?.channelId;
			if (!channelId) continue;
			if (!known.has(channelId)) fresh++;
			statements.save.run({
				channel_id: channelId,
				youtube_channel: snippet?.title?.trim() || channelId,
				description: snippet?.description?.trim() ?? '',
				thumbnail_url: snippet?.thumbnails?.default?.url ?? '',
				now
			});
		}
	})();
	return { total: subscriptions.length, new: fresh };
}

const SYSTEM = `You sort YouTube channels for a personal app that follows people, companies and channels without social media algorithms.
For each channel, decide what it is from its title and description:
- HUMAN: one identifiable person publishing as themselves (a creator, expert, musician, speaker). name is the person's full name as best you can tell, otherwise their public name.
- COMPANY: a business, brand, organisation, institution, publisher or news outlet. name is the organisation's name.
- CHANNEL: anything else: a topic, fan, compilation or anonymous channel, or a group of creators without one brand. name is the channel's title.
When unsure between HUMAN and CHANNEL, choose CHANNEL.
Answer once, covering every channel you were given.`;

const CLASSIFICATION: ClaudeTask['answer'] = {
	name: 'report_classification',
	description: 'Report the kind and name of every channel.',
	schema: {
		type: 'object',
		properties: {
			channels: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						kind: { type: 'string', enum: ['HUMAN', 'COMPANY', 'CHANNEL'] },
						name: { type: 'string' },
						reason: { type: 'string', description: 'A few words on why.' }
					},
					required: ['id', 'kind', 'name', 'reason'],
					additionalProperties: false
				}
			}
		},
		required: ['channels'],
		additionalProperties: false
	}
};

async function classifyBatch(
	batch: { youtubeChannelId: number; youtubeChannel: string; description: string }[]
): Promise<number> {
	const channels = batch.map((c) => ({
		id: c.youtubeChannelId,
		title: c.youtubeChannel,
		description: c.description.slice(0, 600)
	}));
	const answer = await askClaude({
		system: SYSTEM,
		prompt: JSON.stringify(channels),
		answer: CLASSIFICATION,
		effort: 'low',
		refusal: 'The AI declined to sort these channels.'
	});
	const suggestions = parseClassification(
		answer,
		batch.map((c) => c.youtubeChannelId)
	);
	db.transaction(() => {
		for (const [id, suggestion] of suggestions) {
			statements.saveSuggestion.run({
				youtube_channel_id: id,
				suggested_kind: suggestion.kind,
				suggested_name: suggestion.name,
				suggestion_reason: suggestion.reason
			});
		}
	})();
	return suggestions.size;
}

type ChannelChoice = { youtubeChannelId: number; kind: ChannelKind; name: string };

/**
 * Adds a channel as what the user chose. A human or company with that name is reused, otherwise
 * created; it gets the channel as a YouTube account and its feed as a content source. A CHANNEL
 * becomes (or joins) a channel in the app the same way. The channel's ID is linked to that record;
 * a channel already linked to a record, or to one the user deleted, is not added.
 */
const addChannel = db.transaction((choice: ChannelChoice, now = Date.now()) => {
	const channel = statements.get.get({ youtube_channel_id: choice.youtubeChannelId });
	if (!channel || channel.addedAt !== null) return false;
	if (findReference('YOUTUBE', channel.channelId) || isBuried('YOUTUBE', channel.channelId)) {
		statements.markAdded.run({ youtube_channel_id: channel.youtubeChannelId, now });
		return false;
	}
	const feed = channelFeedUrl(channel.channelId);
	const account = { platform: 'youtube', url: channelUrl(channel.channelId) };
	let owner: ReferenceOwner;

	if (choice.kind === 'HUMAN') {
		const humanId =
			findHumanByName(choice.name) ??
			createHuman({
				human: choice.name,
				firstName: '',
				middleNames: [],
				familyName: '',
				birthday: ''
			});
		addSocialAccount('human', humanId, account);
		addSource({ humanId }, feed);
		owner = { humanId };
	} else if (choice.kind === 'COMPANY') {
		const companyId =
			findCompanyByName(choice.name) ??
			createCompany({ company: choice.name, website: '', notes: '' });
		addSocialAccount('company', companyId, account);
		addSource({ companyId }, feed);
		owner = { companyId };
	} else {
		const channelId =
			findChannelByName(choice.name) ??
			createChannel({ channel: choice.name, website: '', notes: '' });
		addSocialAccount('channel', channelId, account);
		addSource({ channelId }, feed);
		owner = { channelId };
	}
	addReference('YOUTUBE', channel.channelId, owner, now);
	statements.markAdded.run({ youtube_channel_id: channel.youtubeChannelId, now });
	return true;
});

export type SortResult = { sorted: number; added: number };
export type SortState = { running: boolean; error: string | null };

let running: Promise<SortResult> | null = null;

function describeError(error: unknown): string {
	try {
		return claudeErrorMessage(error);
	} catch {
		return error instanceof Error ? error.message : String(error);
	}
}
let lastError: string | null = null;

export function sortState(): SortState {
	return { running: running !== null, error: lastError };
}

async function sort(): Promise<SortResult> {
	let sorted = 0;
	for (;;) {
		const batch = statements.listUnclassified.all({ limit: BATCH });
		if (!batch.length) break;
		const done = await classifyBatch(batch);
		if (!done) break;
		sorted += done;
	}
	const added = statements.listSorted.all().filter((choice) => addChannel(choice)).length;
	return { sorted, added };
}

/**
 * Asks Claude what each imported channel is, then adds it as that human, company or channel.
 * Sends each channel's title and description to Claude. Channels already added are never sorted
 * again: the app, not Claude, decides what they are from then on. A call while sorting runs joins
 * that run; nothing happens until Claude is set up.
 */
export function sortChannels(): Promise<SortResult> {
	if (!claudeReady()) return Promise.resolve({ sorted: 0, added: 0 });
	running ??= sort()
		.then((result) => {
			lastError = null;
			return result;
		})
		.catch((error: unknown) => {
			lastError = describeError(error);
			throw error;
		})
		.finally(() => {
			running = null;
		});
	return running;
}
