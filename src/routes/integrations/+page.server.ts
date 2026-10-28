import { integrationSummaries } from '#lib/server/integrations/views.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ integrations: integrationSummaries() });
