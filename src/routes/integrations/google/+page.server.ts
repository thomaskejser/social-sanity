import { oauthActions, oauthLoad } from '#lib/server/integrations/oauth-page.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = oauthLoad('google');

export const actions: Actions = oauthActions('google');
