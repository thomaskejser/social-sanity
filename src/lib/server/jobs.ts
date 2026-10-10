import { Cron, scheduledJobs } from 'croner';
import { refreshExpiringTokens } from './integrations/accounts.ts';
import { listIntegrations } from './integrations/registry.ts';

/** Starts (or, after a dev hot reload, restarts) a named job. */
function schedule(name: string, pattern: string, run: () => Promise<void>) {
	scheduledJobs.find((job) => job.name === name)?.stop();
	new Cron(pattern, { name, protect: true }, run);
}

export function startJobs() {
	// Daily at 03:17 — renew refreshable OAuth tokens before they expire.
	schedule('refresh-tokens', '17 3 * * *', async () => {
		const results = await refreshExpiringTokens(listIntegrations().map((e) => e.integration));
		for (const r of results) {
			if (r.ok) console.info(`[jobs] refreshed ${r.platform} token`);
			else console.error(`[jobs] failed to refresh ${r.platform} token: ${r.error}`);
		}
	});
}
