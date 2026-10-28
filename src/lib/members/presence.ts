import type { SocialPlatform } from '#lib/social-accounts.ts';

/** A social media account shown as a small icon next to a human, company or channel. */
export type PresenceAccount = { platform: SocialPlatform; url: string };

/** Whether a record has a picture, and where it is on social media. */
export type Presence = { avatar: boolean; accounts: PresenceAccount[] };

/** Reads the `avatar` (0 or 1) and `accounts` (JSON) columns the member queries return. */
export function readPresence<T extends { avatar: number; accounts: string | PresenceAccount[] }>(
	row: T
): Omit<T, 'avatar' | 'accounts'> & Presence {
	return {
		...row,
		avatar: row.avatar === 1,
		accounts: typeof row.accounts === 'string' ? JSON.parse(row.accounts) : row.accounts
	};
}
