import type { ServerInit } from '@sveltejs/kit/hooks';
import { Agent, setGlobalDispatcher } from 'undici';
import { startJobs } from '#lib/server/jobs/index.ts';
import { failInterruptedAttempts } from '#lib/server/posts/attempts.ts';

export const init: ServerInit = () => {
	// Node's fetch negotiates HTTP/2 with servers that offer it, and a timed-out HTTP/2 stream can
	// raise an error nobody listens for, which stops the whole server. HTTP/1.1 fails per request.
	setGlobalDispatcher(new Agent({ allowH2: false }));
	failInterruptedAttempts();
	startJobs();
};
