import { createChannel, findChannelByName, renameChannel } from '../channels/store.ts';
import { createHuman, findHumanByName, renameHuman } from '../humans/store.ts';
import { addSocialAccount } from '../social-accounts.ts';
import { fetchSource, fetchText } from '../sources/fetch.ts';
import { addSource, listSources, type ContentSource } from '../sources/store.ts';
import { feedTitleName, type MediumFollow } from '#lib/medium-export.ts';
import type { MemberKind } from '#lib/groups/member.ts';

export type ImportedFollow = MediumFollow & {
	record: { kind: MemberKind; id: number; name: string };
	/** Whether the human or channel was created, rather than already in the app. */
	created: boolean;
};

export type FeedReading = {
	running: boolean;
	total: number;
	read: number;
	failed: number;
	/** The last failure, e.g. Medium asking to slow down. */
	lastError: string | null;
};

type Owner = { kind: 'human' | 'channel'; id: number; name: string };

/** The human or channel that has this feed as a content source. */
function ownerOfFeed(feedUrl: string): { source: ContentSource; owner: Owner } | undefined {
	const source = listSources().find(
		(s) => s.contentSource === feedUrl && (s.humanId !== null || s.channelId !== null)
	);
	if (!source) return undefined;
	const owner: Owner =
		source.humanId !== null
			? { kind: 'human', id: source.humanId, name: source.owner }
			: { kind: 'channel', id: source.channelId!, name: source.owner };
	return { source, owner };
}

/** A human for a writer, a channel for a publication: one with the same name, or a new one. */
function addOwner(follow: MediumFollow): Owner & { created: boolean } {
	if (follow.kind === 'writer') {
		const existing = findHumanByName(follow.name);
		const id =
			existing ??
			createHuman({
				human: follow.name,
				firstName: '',
				middleNames: [],
				familyName: '',
				birthday: ''
			});
		addSocialAccount('human', id, { platform: 'medium', url: follow.url });
		addSource({ humanId: id }, follow.feedUrl);
		return { kind: 'human', id, name: follow.name, created: existing === undefined };
	}
	const existing = findChannelByName(follow.name);
	const id = existing ?? createChannel({ channel: follow.name, website: follow.url, notes: '' });
	if (new URL(follow.url).hostname.endsWith('medium.com'))
		addSocialAccount('channel', id, { platform: 'medium', url: follow.url });
	addSource({ channelId: id }, follow.feedUrl);
	return { kind: 'channel', id, name: follow.name, created: existing === undefined };
}

/**
 * Adds the writers as humans and the publications as channels, reusing one with the same name, and
 * gives each its Medium feed as a content source. Nothing is fetched here, so it is quick; call
 * `readImportedFeeds` to read the feeds. A follow imported before is recognised by its feed, so
 * importing again adds nothing twice.
 */
export function importFollows(follows: MediumFollow[]): ImportedFollow[] {
	return follows.map((follow) => {
		const known = ownerOfFeed(follow.feedUrl);
		if (known) return { ...follow, record: known.owner, created: false };
		const { created, ...owner } = addOwner(follow);
		return { ...follow, record: owner, created };
	});
}

let reading: FeedReading = { running: false, total: 0, read: 0, failed: 0, lastError: null };

export function feedReading(): FeedReading {
	return reading;
}

/**
 * Reads the feeds of imported follows one after another, in the background; the feed reader spaces
 * out requests to Medium. A writer still named by their Medium handle gets the name their feed
 * gives, e.g. "William Vaughn" for "williamvaughn", even when someone else already has that name:
 * finding and merging duplicates is left to the user, through Auto Merge. Does nothing while a
 * reading is running.
 */
export function readImportedFeeds(imported: ImportedFollow[]) {
	if (reading.running) return;
	reading = { running: true, total: imported.length, read: 0, failed: 0, lastError: null };
	void (async () => {
		for (const follow of imported) {
			const known = ownerOfFeed(follow.feedUrl);
			if (!known) continue;
			let page: { url: string; body: string } | undefined;
			try {
				page = await fetchText(follow.feedUrl);
				const title = /<title>(?:<!\[CDATA\[)?([^<]*?)(?:\]\]>)?<\/title>/i.exec(page.body)?.[1];
				const name = title && feedTitleName(title);
				if (name && known.owner.name === follow.name && name !== follow.name) {
					if (known.owner.kind === 'human') renameHuman(known.owner.id, name);
					else renameChannel(known.owner.id, name);
				}
			} catch (error) {
				reading.failed++;
				reading.lastError = error instanceof Error ? error.message : String(error);
			}
			if (page) {
				const result = await fetchSource(known.source, page);
				if (result.ok) reading.read++;
				else {
					reading.failed++;
					reading.lastError = result.message;
				}
			}
		}
		reading = { ...reading, running: false };
	})();
}
