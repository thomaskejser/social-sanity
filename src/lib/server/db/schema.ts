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

/** The git repository posts are read from and written to (single row, id = 1). An HTTPS token
 * is never stored — only the name of the environment variable that holds it. */
export const gitRepo = sqliteTable('git_repo', {
	id: integer('id').primaryKey(),
	url: text('url').notNull(),
	branch: text('branch').notNull(),
	postsDir: text('posts_dir').notNull(),
	tokenEnvVar: text('token_env_var'),
	tokenUsername: text('token_username').notNull(),
	authorName: text('author_name').notNull(),
	authorEmail: text('author_email').notNull(),
	lastSyncAt: integer('last_sync_at'),
	lastSyncOk: integer('last_sync_ok', { mode: 'boolean' }),
	lastSyncMessage: text('last_sync_message'),
	updatedAt: integer('updated_at').notNull()
});

export type GitRepo = typeof gitRepo.$inferSelect;

/** Publishing in progress or failed, per post and platform. Successful publishes are recorded
 * in the post's Markdown file instead; `unrecorded` holds one that succeeded but could not be
 * written to the repository yet. `postId` is the post's path in the posts folder. */
export const publishAttempts = sqliteTable(
	'publish_attempts',
	{
		postId: text('post_id').notNull(),
		platform: text('platform').notNull(),
		status: text('status', { enum: ['publishing', 'failed', 'unrecorded'] }).notNull(),
		error: text('error'),
		remoteId: text('remote_id'),
		remoteUrl: text('remote_url'),
		publishedAt: integer('published_at'),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [primaryKey({ columns: [table.postId, table.platform] })]
);

export type PublishAttempt = typeof publishAttempts.$inferSelect;
