import { databaseSnapshot } from '#lib/server/backup.ts';
import type { RequestHandler } from './$types';

/** The database download on the Settings page; as open as the rest of the app. */
export const GET: RequestHandler = () => databaseSnapshot();
