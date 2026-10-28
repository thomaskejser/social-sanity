import { oauthActions, oauthLoad } from '#lib/server/integrations/oauth-page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = oauthLoad('linkedin');

export const actions: Actions = oauthActions('linkedin');
