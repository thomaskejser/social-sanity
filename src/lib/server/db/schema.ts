import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
