import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SOCIAL_SANITY_DATABASE_URL } from '$app/env/private';
import schema from './schema.sql?raw';
import contentSourceColumns from './migrations/content-source-columns.sql?raw';
import contentSourceCompany from './migrations/content-source-company.sql?raw';
import humanColumns from './migrations/human-columns.sql?raw';
import externalReference from './migrations/external-reference.sql?raw';
import channel from './migrations/channel.sql?raw';
import articleColumns from './migrations/article-columns.sql?raw';
import articlePreviewRead from './migrations/article-preview-read.sql?raw';
import enrichedAtMissing from './migrations/enriched-at-missing.sql?raw';
import enrichedAtHuman from './migrations/enriched-at-human.sql?raw';
import enrichedAtCompany from './migrations/enriched-at-company.sql?raw';
import enrichedAtChannel from './migrations/enriched-at-channel.sql?raw';
import referenceSourceMissing from './migrations/reference-source-missing.sql?raw';
import referenceSourceReference from './migrations/reference-source-reference.sql?raw';
import referenceSourceTombstone from './migrations/reference-source-tombstone.sql?raw';
import avatarColumns from './migrations/avatar-columns.sql?raw';
import humanAvatar from './migrations/human-avatar.sql?raw';

mkdirSync(dirname(SOCIAL_SANITY_DATABASE_URL), { recursive: true });

export const db = new Database(SOCIAL_SANITY_DATABASE_URL);
db.pragma('journal_mode = WAL');
migrate();
db.pragma('foreign_keys = ON');
db.exec(schema);

/**
 * Brings tables created by an older schema up to date before `schema.sql` runs, which only creates
 * what is missing. Foreign keys are switched on again by the caller.
 */
function migrate() {
	migrateContentSource();
	migrateExternalReference();
	migrateChannel();
	migrateArticle();
	migrateEnrichedAt();
	migrateReferenceSource();
	migrateHumanAvatar();
}

/** Lets a content source belong to a company. */
function migrateContentSource() {
	const columns = db.prepare<[], { name: string }>(contentSourceColumns).all();
	if (columns.length && !columns.some((c) => c.name === 'company_id')) {
		// better-sqlite3 turns foreign keys on by default; dropping the old table with them on
		// would cascade and delete every article.
		db.pragma('foreign_keys = OFF');
		db.transaction(() => {
			db.exec(contentSourceCompany);
			const problems = db.pragma('foreign_key_check');
			if ((problems as unknown[]).length)
				throw new Error('content_source migration broke foreign keys');
		})();
	}
}

/** Moves the Google Contacts link into external_reference. */
function migrateExternalReference() {
	const columns = db.prepare<[], { name: string }>(humanColumns).all();
	if (!columns.some((c) => c.name === 'google_resource_name')) return;
	db.pragma('foreign_keys = OFF');
	db.transaction(() => {
		db.exec(externalReference);
		const problems = db.pragma('foreign_key_check');
		if ((problems as unknown[]).length)
			throw new Error('external_reference migration broke foreign keys');
	})();
}

/** Gives channels their own table, moving them out of publisher. */
function migrateChannel() {
	const columns = db.prepare<[], { name: string }>(contentSourceColumns).all();
	if (!columns.length || columns.some((c) => c.name === 'channel_id')) return;
	db.pragma('foreign_keys = OFF');
	db.transaction(() => {
		db.exec(channel);
		const problems = db.pragma('foreign_key_check');
		if ((problems as unknown[]).length) throw new Error('channel migration broke foreign keys');
	})();
}

/** Gives articles a preview picture and a read mark. */
function migrateArticle() {
	const columns = db.prepare<[], { name: string }>(articleColumns).all();
	if (!columns.length || columns.some((c) => c.name === 'read_at')) return;
	db.exec(articlePreviewRead);
}

/** Gives humans, companies and channels a mark for when Claude last looked them up. */
function migrateEnrichedAt() {
	const alter: Record<string, string> = {
		human: enrichedAtHuman,
		company: enrichedAtCompany,
		channel: enrichedAtChannel
	};
	for (const { table } of db.prepare<[], { table: string }>(enrichedAtMissing).all())
		db.exec(alter[table]);
}

/** Lets outside IDs come from Reddit. SQLite cannot change a check, so the tables are rebuilt. */
function migrateReferenceSource() {
	const rebuild: Record<string, string> = {
		external_reference: referenceSourceReference,
		external_reference_tombstone: referenceSourceTombstone
	};
	const tables = db.prepare<[], { table: string }>(referenceSourceMissing).all();
	if (!tables.length) return;
	db.pragma('foreign_keys = OFF');
	db.transaction(() => {
		for (const { table } of tables) db.exec(rebuild[table]);
		const problems = db.pragma('foreign_key_check');
		if ((problems as unknown[]).length)
			throw new Error('reference source migration broke foreign keys');
	})();
}

/** Moves the pictures of humans into human_avatar, where a human can have several. */
function migrateHumanAvatar() {
	const columns = db.prepare<[], { name: string }>(avatarColumns).all();
	if (!columns.some((c) => c.name === 'human_id')) return;
	db.pragma('foreign_keys = OFF');
	db.transaction(() => {
		db.exec(humanAvatar);
		const problems = db.pragma('foreign_key_check');
		if ((problems as unknown[]).length)
			throw new Error('human_avatar migration broke foreign keys');
	})();
}

/** SQLite has no boolean type; flags are stored as 0 or 1. */
export function flag(value: boolean | null): number | null {
	return value === null ? null : Number(value);
}

export function fromFlag(value: number | null): boolean | null {
	return value === null ? null : value === 1;
}
