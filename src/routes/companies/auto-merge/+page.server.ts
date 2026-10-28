import { autoMergeActions, autoMergeLoad } from '#lib/server/members/auto-merge-page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = autoMergeLoad('company');

export const actions: Actions = autoMergeActions('company');
