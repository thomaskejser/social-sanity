import { autoEnrichActions, autoEnrichLoad } from '#lib/server/enrich/page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = autoEnrichLoad('company');

export const actions: Actions = autoEnrichActions('company');
