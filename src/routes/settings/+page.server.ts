import { SOCIAL_SANITY_BACKUP_TOKEN } from '$app/env/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ backupApiEnabled: !!SOCIAL_SANITY_BACKUP_TOKEN });
