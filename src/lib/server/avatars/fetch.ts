import { isGoogleConnected, listContactPhotos } from '../humans/google-contacts.ts';
import { downloadAvatar, listMissingAvatars, saveAvatar } from './store.ts';

export type AvatarResult = { saved: number; failed: number; withoutPicture: number };

/**
 * Downloads a picture for every record that has a Google Contacts or YouTube ID but no picture:
 * the contact's own photo, or the YouTube channel picture. Records without one are left alone and
 * tried again next time.
 */
export async function fetchMissingAvatars(): Promise<AvatarResult> {
	const missing = listMissingAvatars();
	const result: AvatarResult = { saved: 0, failed: 0, withoutPicture: 0 };
	const needsGoogle = missing.some((m) => m.source === 'GOOGLE_CONTACTS');
	const googlePhotos = needsGoogle && isGoogleConnected() ? await listContactPhotos() : new Map();
	const done = new Set<string>();

	for (const item of missing) {
		const key = JSON.stringify(item.owner);
		if (done.has(key)) continue;
		const url =
			item.source === 'YOUTUBE' ? item.youtubeThumbnail : googlePhotos.get(item.externalReference);
		if (!url) {
			result.withoutPicture++;
			continue;
		}
		try {
			saveAvatar(item.owner, await downloadAvatar(url), url);
			done.add(key);
			result.saved++;
		} catch (error) {
			console.error(`[avatars] ${error instanceof Error ? error.message : String(error)}`);
			result.failed++;
		}
	}
	return result;
}
