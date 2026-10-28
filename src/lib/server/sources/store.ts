import { db, flag, fromFlag } from '../db/index.ts';
import listPublishersSql from './sql/list-publishers.sql?raw';
import createPublisherSql from './sql/create-publisher.sql?raw';
import findPublisherSql from './sql/find-publisher.sql?raw';
import deletePublisherSql from './sql/delete-publisher.sql?raw';
import setPublisherKudosSql from './sql/set-publisher-kudos.sql?raw';
import listSourcesSql from './sql/list-sources.sql?raw';
import addSourceSql from './sql/add-source.sql?raw';
import deleteSourceSql from './sql/delete-source.sql?raw';
import moveSourcesSql from './sql/move-sources.sql?raw';
import recordFetchSql from './sql/record-fetch.sql?raw';
import saveArticleSql from './sql/save-article.sql?raw';
import listFeedSql from './sql/list-feed.sql?raw';
import getArticleSql from './sql/get-article.sql?raw';
import markReadSql from './sql/mark-read.sql?raw';
import listWithoutImageSql from './sql/list-without-image.sql?raw';
import savePageImageSql from './sql/save-page-image.sql?raw';
import type { FeedItem } from './feed.ts';
import type { MemberOwner } from '../references/store.ts';

export const PUBLISHER_KINDS = ['COMPANY', 'AGENT'] as const;
export type PublisherKind = (typeof PUBLISHER_KINDS)[number];

export type Publisher = {
	publisherId: number;
	publisher: string;
	publisherKind: PublisherKind;
	kudos: number;
};

/** A content source belongs to exactly one human, company, channel or publisher. */
export type ContentSource = {
	contentSourceId: number;
	/** The URI the source is reached at. */
	contentSource: string;
	humanId: number | null;
	companyId: number | null;
	channelId: number | null;
	publisherId: number | null;
	owner: string;
	/** The RSS or Atom feed found for the URI; '' when none has been found. */
	feedUri: string;
	lastFetchedAt: number | null;
	lastFetchOk: boolean | null;
	lastFetchMessage: string | null;
};

export type FeedEntry = {
	articleId: number;
	article: string;
	summary: string;
	/** Whether the full article can be shown in the app. */
	readable: boolean;
	url: string;
	publishedAt: number;
	owner: string;
	videoId: string;
	/** A picture for the preview; '' when none is known. */
	imageUrl: string;
	/** Exactly one of these is set: who published the article. */
	humanId: number | null;
	companyId: number | null;
	channelId: number | null;
	publisherId: number | null;
	kudos: number;
};

export type Article = {
	articleId: number;
	article: string;
	summary: string;
	contentHtml: string;
	videoId: string;
	url: string;
	publishedAt: number;
	owner: string;
};

const statements = {
	listPublishers: db.prepare<[], Publisher>(listPublishersSql),
	createPublisher: db.prepare<[Record<string, unknown>], { publisherId: number }>(
		createPublisherSql
	),
	findPublisher: db.prepare<[Record<string, unknown>], { publisherId: number }>(findPublisherSql),
	deletePublisher: db.prepare(deletePublisherSql),
	setPublisherKudos: db.prepare(setPublisherKudosSql),
	listSources: db.prepare<[], Omit<ContentSource, 'lastFetchOk'> & { lastFetchOk: number | null }>(
		listSourcesSql
	),
	addSource: db.prepare(addSourceSql),
	moveSources: db.prepare(moveSourcesSql),
	deleteSource: db.prepare(deleteSourceSql),
	recordFetch: db.prepare(recordFetchSql),
	saveArticle: db.prepare(saveArticleSql),
	listFeed: db.prepare<
		[{ since: number; limit: number }],
		Omit<FeedEntry, 'readable'> & { readable: number }
	>(listFeedSql),
	getArticle: db.prepare<[{ article_id: number }], Article>(getArticleSql),
	markRead: db.prepare(markReadSql),
	listWithoutImage: db.prepare<
		[{ since: number; limit: number }],
		{ articleId: number; url: string }
	>(listWithoutImageSql),
	savePageImage: db.prepare(savePageImageSql)
};

export function isPublisherKind(value: unknown): value is PublisherKind {
	return PUBLISHER_KINDS.includes(value as PublisherKind);
}

export function listPublishers(): Publisher[] {
	return statements.listPublishers.all();
}

export function createPublisher(publisher: string, kind: PublisherKind): number {
	return statements.createPublisher.get({ publisher, publisher_kind: kind })!.publisherId;
}

/** The publisher of this kind named `publisher`, ignoring case. */
export function findPublisher(publisher: string, kind: PublisherKind): number | undefined {
	return statements.findPublisher.get({ publisher, publisher_kind: kind })?.publisherId;
}

export function deletePublisher(publisherId: number) {
	statements.deletePublisher.run({ publisher_id: publisherId });
}

export function setPublisherKudos(publisherId: number, kudos: number) {
	statements.setPublisherKudos.run({ publisher_id: publisherId, kudos });
}

export function listSources(): ContentSource[] {
	return statements.listSources
		.all()
		.map((row) => ({ ...row, lastFetchOk: fromFlag(row.lastFetchOk) }));
}

export type SourceOwner =
	{ humanId: number } | { companyId: number } | { channelId: number } | { publisherId: number };

export function addSource(owner: SourceOwner, uri: string) {
	statements.addSource.run({
		content_source: uri,
		human_id: 'humanId' in owner ? owner.humanId : null,
		company_id: 'companyId' in owner ? owner.companyId : null,
		channel_id: 'channelId' in owner ? owner.channelId : null,
		publisher_id: 'publisherId' in owner ? owner.publisherId : null
	});
}

function ownerIds(owner: MemberOwner) {
	return {
		human_id: 'humanId' in owner ? owner.humanId : null,
		company_id: 'companyId' in owner ? owner.companyId : null,
		channel_id: 'channelId' in owner ? owner.channelId : null
	};
}

/** Hands a record's content sources, and their articles, to the record that replaces it. */
export function moveSources(from: MemberOwner, to: MemberOwner) {
	const target = ownerIds(to);
	statements.moveSources.run({
		...ownerIds(from),
		to_human_id: target.human_id,
		to_company_id: target.company_id,
		to_channel_id: target.channel_id
	});
}

export function deleteSource(contentSourceId: number) {
	statements.deleteSource.run({ content_source_id: contentSourceId });
}

export function recordFetch(
	contentSourceId: number,
	result: { ok: boolean; message: string; feedUri: string },
	now = Date.now()
) {
	statements.recordFetch.run({
		content_source_id: contentSourceId,
		feed_uri: result.feedUri,
		fetched_at: now,
		ok: flag(result.ok),
		message: result.message
	});
}

export const saveArticles = db.transaction((contentSourceId: number, items: FeedItem[]) => {
	for (const item of items) {
		statements.saveArticle.run({
			content_source_id: contentSourceId,
			guid: item.guid,
			article: item.article,
			summary: item.summary,
			content_html: item.contentHtml,
			video_id: item.videoId,
			image_url: item.imageUrl,
			url: item.url,
			published_at: item.publishedAt
		});
	}
});

export function listFeed(since: number, limit: number): FeedEntry[] {
	return statements.listFeed
		.all({ since, limit })
		.map((row) => ({ ...row, readable: row.readable === 1 }));
}

/** Hides an article from the feed. */
export function markArticleRead(articleId: number, now = Date.now()) {
	statements.markRead.run({ article_id: articleId, now });
}

/** Recent unread articles with no picture whose page has not been looked at yet. */
export function listArticlesWithoutImage(since: number, limit: number) {
	return statements.listWithoutImage.all({ since, limit });
}

/** Records what the article's page offered as a picture; '' when nothing. */
export function savePageImage(articleId: number, imageUrl: string, now = Date.now()) {
	statements.savePageImage.run({ article_id: articleId, image_url: imageUrl, now });
}

export function getArticle(articleId: number): Article | undefined {
	return statements.getArticle.get({ article_id: articleId });
}

/** Accepts only absolute http(s) URIs, the forms a content source can be fetched from. */
export function parseSourceUri(value: string): string | undefined {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}
