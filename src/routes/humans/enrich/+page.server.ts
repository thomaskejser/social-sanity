import { enrichActions, enrichLoad } from '#lib/server/enrich/page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = enrichLoad('human');

export const actions: Actions = enrichActions('human');
