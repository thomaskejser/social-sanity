import { autoEnrichActions, autoEnrichLoad } from '#lib/server/enrich/page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = autoEnrichLoad('human');

export const actions: Actions = autoEnrichActions('human');
