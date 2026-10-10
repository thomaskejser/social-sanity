import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Free-form key/value application settings (e.g. the filter interests prompt, budget caps). */
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
