import type { ServerInit } from '@sveltejs/kit/hooks';
import { startJobs } from '#lib/server/jobs.ts';
import { failInterruptedAttempts } from '#lib/server/posts/attempts.ts';

export const init: ServerInit = () => {
	failInterruptedAttempts();
	startJobs();
};
