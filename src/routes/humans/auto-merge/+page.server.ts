import { autoMergeActions, autoMergeLoad } from '#lib/server/members/auto-merge-page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = autoMergeLoad('human');

export const actions: Actions = autoMergeActions('human');
