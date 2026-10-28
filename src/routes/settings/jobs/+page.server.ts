import { listJobs } from '#lib/server/jobs/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ jobs: listJobs() });
