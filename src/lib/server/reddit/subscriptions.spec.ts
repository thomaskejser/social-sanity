import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = new Database(':memory:');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
vi.mock('../db/index.ts', () => ({ db, flag: Number, fromFlag: (v: number | null) => v === 1 }));
vi.mock('../integrations/reddit.ts', () => ({ redditGet: vi.fn() }));
vi.mock('../sources/fetch.ts', () => ({ fetchSource: vi.fn() }));

const { addSubscription, countImported, listImported, parseSubscriptions } =
	await import('./subscriptions.ts');
const { createChannel, deleteChannel } = await import('../channels/store.ts');
const { listSources } = await import('../sources/store.ts');
const { listSocialAccounts } = await import('../social-accounts.ts');

const rust = { kind: 'subreddit', name: 'rust', fullname: 't5_rust', iconUrl: '' } as const;
const spez = { kind: 'user', name: 'spez', fullname: 't5_spez', iconUrl: '' } as const;

describe('parseSubscriptions', () => {
	it('tells subreddits from followed people, and keeps only https pictures', () => {
		expect(
			parseSubscriptions({
				data: {
					children: [
						{
							data: {
								name: 't5_rust',
								display_name: 'rust',
								subreddit_type: 'public',
								community_icon: 'https://styles.redditmedia.com/r.png',
								icon_img: ''
							}
						},
						{
							data: {
								name: 't5_spez',
								display_name: 'u_spez',
								subreddit_type: 'user',
								icon_img: 'http://insecure.example/x.png'
							}
						},
						{ data: { display_name: 'no_id' } }
					]
				}
			})
		).toEqual([
			{
				kind: 'subreddit',
				name: 'rust',
				fullname: 't5_rust',
				iconUrl: 'https://styles.redditmedia.com/r.png'
			},
			{ kind: 'user', name: 'spez', fullname: 't5_spez', iconUrl: '' }
		]);
	});
});

describe('addSubscription', () => {
	beforeEach(() => {
		for (const table of [
			'external_reference',
			'external_reference_tombstone',
			'content_source',
			'channel',
			'human'
		])
			db.exec(`DELETE FROM ${table}`);
	});

	it('adds a subreddit as a channel and a person as a human, with account and source', () => {
		const channel = addSubscription(rust);
		const human = addSubscription(spez);
		expect(listImported(10, 0).map((m) => [m.kind, m.name])).toEqual([
			['channel', 'r/rust'],
			['human', 'u/spez']
		]);
		expect(
			channel && 'channelId' in channel && listSocialAccounts('channel', channel.channelId)
		).toMatchObject([{ platform: 'reddit', url: 'https://www.reddit.com/r/rust/' }]);
		expect(human && 'humanId' in human).toBe(true);
		expect(
			listSources()
				.map((s) => s.contentSource)
				.sort()
		).toEqual(['https://www.reddit.com/r/rust/', 'https://www.reddit.com/user/spez/']);
	});

	it('reuses a channel with the same name, and never adds one twice', () => {
		const channelId = createChannel({ channel: 'r/rust', website: '', notes: '' });
		expect(addSubscription(rust)).toEqual({ channelId });
		expect(addSubscription(rust)).toBeUndefined();
		expect(countImported()).toBe(1);
	});

	it('does not bring back a subreddit the user deleted', () => {
		const owner = addSubscription(rust);
		deleteChannel((owner as { channelId: number }).channelId);
		expect(addSubscription(rust)).toBeUndefined();
		expect(countImported()).toBe(0);
	});
});
