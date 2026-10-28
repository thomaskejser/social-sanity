import { error } from '@sveltejs/kit';
import { SOCIAL_SANITY_BACKUP_TOKEN } from '$app/env/private';
import { databaseSnapshot, isBackupAuthorized } from '#lib/server/backup.ts';
import type { RequestHandler } from './$types';

/** The database for backup agents: `Authorization: Bearer <SOCIAL_SANITY_BACKUP_TOKEN>`. */
export const GET: RequestHandler = ({ request }) => {
	if (!SOCIAL_SANITY_BACKUP_TOKEN)
		error(404, 'Backups over the API are off; set SOCIAL_SANITY_BACKUP_TOKEN to turn them on.');
	if (!isBackupAuthorized(request.headers.get('authorization'), SOCIAL_SANITY_BACKUP_TOKEN))
		error(401, 'Send the backup token as Authorization: Bearer <token>.');
	return databaseSnapshot();
};
