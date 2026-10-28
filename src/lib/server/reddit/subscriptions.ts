import { downloadAvatar, saveAvatar } from '../avatars/store.ts';
import { createChannel, findChannelByName } from '../channels/store.ts';
import { db } from '../db/index.ts';
import { createHuman, findHumanByName } from '../humans/store.ts';
import { redditGet } from '../integrations/reddit.ts';
import { addReference, findReference, isBuried, type MemberOwner } from '../references/store.ts';
import { addSocialAccount } from '../social-accounts.ts';
import { fetchSource } from '../sources/fetch.ts';
import { addSource, listSources } from '../sources/store.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import { redditUrl, type RedditCommunity } from '#lib/reddit.ts';
import listImportedSql from './sql/list-imported.sql?raw';
import countImportedSql from './sql/count-imported.sql?raw';

/** A subreddit or profile the Reddit account follows. */
export type Subscription = RedditCommunity & {
	/** Reddit's own ID, e.g. `t5_2qh1i`; it never changes. */
	fullname: string;
	/** An https picture of the subreddit or person; '' when it has none. */
	iconUrl: string;
};

export type ImportResult = {
	total: number;
	added: number;
	/** Already in the app, or deleted by the user and not brought back. */
	known: number;
};

type SubredditData = {
	name?: string;
	display_name?: string;
	subreddit_type?: string;
	community_icon?: string;
	icon_img?: string;
};

function httpsOrEmpty(url: string | undefined): string {
	return url?.startsWith('https://') ? url : '';
}

/** The followed subreddits and profiles in a page of `/subreddits/mine/subscriber`. */
export function parseSubscriptions(listing: Record<string, unknown>): Subscription[] {
	const data = listing.data as { children?: { data?: SubredditData }[] } | undefined;
	const subscriptions: Subscription[] = [];
	for (const { data: sub } of data?.children ?? []) {
		if (!sub?.name || !sub.display_name) continue;
		const user = sub.subreddit_type === 'user' && sub.display_name.startsWith('u_');
		subscriptions.push({
			kind: user ? 'user' : 'subreddit',
			name: user ? sub.display_name.slice(2) : sub.display_name,
			fullname: sub.name,
			iconUrl: httpsOrEmpty(sub.community_icon) || httpsOrEmpty(sub.icon_img)
		});
	}
	return subscriptions;
}

async function fetchSubscriptions(): Promise<Subscription[]> {
	const subscriptions: Subscription[] = [];
	let after = '';
	do {
		const page = await redditGet('/subreddits/mine/subscriber', {
			limit: '100',
			...(after ? { after } : {})
		});
		subscriptions.push(...parseSubscriptions(page));
		after = ((page.data as { after?: string | null } | undefined)?.after ?? '') || '';
	} while (after);
	return subscriptions;
}

/**
 * Adds a followed subreddit as a channel named `r/name`, and a followed person as a human named
 * `u/name`; a record with that name is reused. It gets the Reddit address as a social account and
 * as a content source, and Reddit's ID is linked to it. Returns the record, or undefined when the
 * ID is already linked or the user deleted its record.
 */
export const addSubscription = db.transaction(
	(subscription: Subscription, now = Date.now()): MemberOwner | undefined => {
		if (findReference('REDDIT', subscription.fullname) || isBuried('REDDIT', subscription.fullname))
			return undefined;
		const url = redditUrl(subscription);
		const account = { platform: 'reddit', url };
		let owner: MemberOwner;
		if (subscription.kind === 'subreddit') {
			const name = `r/${subscription.name}`;
			const channelId =
				findChannelByName(name) ?? createChannel({ channel: name, website: '', notes: '' }, now);
			addSocialAccount('channel', channelId, account);
			owner = { channelId };
		} else {
			const name = `u/${subscription.name}`;
			const humanId =
				findHumanByName(name) ??
				createHuman(
					{ human: name, firstName: '', middleNames: [], familyName: '', birthday: '' },
					now
				);
			addSocialAccount('human', humanId, account);
			owner = { humanId };
		}
		addSource(owner, url);
		addReference('REDDIT', subscription.fullname, owner, now);
		return owner;
	}
);

export type ImportedMember = { kind: MemberKind; id: number; name: string };

const statements = {
	listImported: db.prepare<[{ limit: number; offset: number }], ImportedMember>(listImportedSql),
	countImported: db.prepare<[], { imported: number }>(countImportedSql)
};

export function listImported(limit: number, offset: number): ImportedMember[] {
	return statements.listImported.all({ limit, offset });
}

export function countImported(): number {
	return statements.countImported.get()!.imported;
}

/** Downloads the pictures of newly added records and reads their posts, one at a time. */
async function fillIn(added: { subscription: Subscription; owner: MemberOwner }[]) {
	for (const { subscription, owner } of added) {
		if (!subscription.iconUrl) continue;
		try {
			saveAvatar(owner, await downloadAvatar(subscription.iconUrl), subscription.iconUrl);
		} catch {
			// A record without a picture shows its initials.
		}
	}
	const urls = new Set(added.map(({ subscription }) => redditUrl(subscription)));
	for (const source of listSources().filter((s) => urls.has(s.contentSource)))
		await fetchSource(source);
}

let running: Promise<ImportResult> | null = null;
let fillingIn: Promise<void> = Promise.resolve();

async function runImport(now: number): Promise<ImportResult> {
	const subscriptions = await fetchSubscriptions();
	const added: { subscription: Subscription; owner: MemberOwner }[] = [];
	for (const subscription of subscriptions) {
		const owner = addSubscription(subscription, now);
		if (owner) added.push({ subscription, owner });
	}
	fillingIn = fillingIn
		.then(() => fillIn(added))
		.catch((error: unknown) => console.error('[reddit]', error));
	return {
		total: subscriptions.length,
		added: added.length,
		known: subscriptions.length - added.length
	};
}

/**
 * Adds every subreddit and person the Reddit account follows that is not in the app yet. Their
 * pictures and posts are read in the background afterwards, so they show up in Consume. A call
 * while an import runs joins that run.
 */
export function importRedditSubscriptions(now = Date.now()): Promise<ImportResult> {
	running ??= runImport(now).finally(() => {
		running = null;
	});
	return running;
}
