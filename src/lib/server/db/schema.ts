import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Free-form key/value application settings (e.g. the filter interests prompt, budget caps). */
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

/** One connected social account per platform, authorised via OAuth. Tokens are encrypted at rest. */
export const accounts = sqliteTable('accounts', {
	platform: text('platform').primaryKey(),
	externalId: text('external_id').notNull(),
	displayName: text('display_name').notNull(),
	accessTokenEnc: text('access_token_enc').notNull(),
	refreshTokenEnc: text('refresh_token_enc'),
	/** Access token expiry, epoch milliseconds. Null when the platform does not report one. */
	expiresAt: integer('expires_at'),
	scopes: text('scopes').notNull().default(''),
	connectedAt: integer('connected_at').notNull(),
	refreshedAt: integer('refreshed_at').notNull()
});

export type Account = typeof accounts.$inferSelect;

/** The FTP/SFTP server files are uploaded to (single row, id = 1). The password is never stored —
 * only the name of the environment variable that holds it. */
export const ftpServer = sqliteTable('ftp_server', {
	id: integer('id').primaryKey(),
	protocol: text('protocol', { enum: ['ftp', 'sftp'] })
		.notNull()
		.default('ftp'),
	host: text('host').notNull(),
	port: integer('port').notNull(),
	username: text('username').notNull(),
	passwordEnvVar: text('password_env_var').notNull(),
	/** FTP only; ignored for SFTP, which is always encrypted. */
	encryption: text('encryption', { enum: ['explicit', 'implicit', 'none'] }).notNull(),
	/** SFTP only: SHA-256 fingerprint of the server's host key, pinned on the first successful test. */
	hostKeyFingerprint: text('host_key_fingerprint'),
	remoteDir: text('remote_dir').notNull(),
	publicUrl: text('public_url'),
	lastTestedAt: integer('last_tested_at'),
	lastTestOk: integer('last_test_ok', { mode: 'boolean' }),
	lastTestMessage: text('last_test_message'),
	updatedAt: integer('updated_at').notNull()
});

export type FtpServer = typeof ftpServer.$inferSelect;

/** A post written once and published to several platforms. `text` is the shared draft text. */
export const posts = sqliteTable('posts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	text: text('text').notNull(),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export type Post = typeof posts.$inferSelect;

/** Uploaded images and videos of a post, in display order. Files live in MEDIA_DIR. */
export const postMedia = sqliteTable('post_media', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	postId: integer('post_id')
		.notNull()
		.references(() => posts.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	kind: text('kind', { enum: ['image', 'video'] }).notNull(),
	mimeType: text('mime_type').notNull(),
	/** Random file name under MEDIA_DIR; also the public URL path segment. */
	fileName: text('file_name').notNull().unique(),
	originalName: text('original_name').notNull(),
	size: integer('size').notNull()
});

export type PostMedia = typeof postMedia.$inferSelect;

/** One platform's version of a post: its own text and publishing state. */
export const postTargets = sqliteTable(
	'post_targets',
	{
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		platform: text('platform').notNull(),
		text: text('text').notNull(),
		status: text('status', { enum: ['draft', 'publishing', 'published', 'failed'] })
			.notNull()
			.default('draft'),
		remoteId: text('remote_id'),
		remoteUrl: text('remote_url'),
		error: text('error'),
		publishedAt: integer('published_at'),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [primaryKey({ columns: [table.postId, table.platform] })]
);

export type PostTarget = typeof postTargets.$inferSelect;
