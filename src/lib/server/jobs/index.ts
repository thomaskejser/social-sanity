import { Cron, scheduledJobs, type CronOptions } from 'croner';
import { fetchMissingAvatars } from '../avatars/fetch.ts';
import { claudeReady } from '../claude.ts';
import { importGoogleContacts, isGoogleConnected } from '../humans/google-contacts.ts';
import { refreshExpiringTokens } from '../integrations/accounts.ts';
import { isRedditConnected } from '../integrations/reddit.ts';
import { listIntegrations } from '../integrations/registry.ts';
import { importRedditSubscriptions } from '../reddit/subscriptions.ts';
import { syncRepo } from '../repo/sync.ts';
import { fetchSubscriptions, isYouTubeConnected, sortChannels } from '../youtube/subscriptions.ts';
import { fetchAllSources, findPageImages } from '../sources/fetch.ts';
import { listJobRuns, saveJobRun } from './store.ts';

type JobInfo = {
	name: string;
	/** What the job does, for the Settings page. */
	title: string;
	/** When it runs, in words. */
	when: string;
	pattern: string;
	options?: CronOptions;
};

/** What one run did, in a sentence. A thrown error counts as a failed run. */
type Outcome = { ok: boolean; message: string };

const jobs = new Map<string, JobInfo>();

const done = (message: string): Outcome => ({ ok: true, message });

/** Starts (or, after a dev hot reload, restarts) a named job, and records each run's outcome. */
function schedule(info: JobInfo, run: () => Promise<Outcome>) {
	jobs.set(info.name, info);
	scheduledJobs.find((job) => job.name === info.name)?.stop();
	new Cron(info.pattern, { ...info.options, name: info.name, protect: true }, async () => {
		const startedAt = Date.now();
		let outcome: Outcome;
		try {
			outcome = await run();
		} catch (error) {
			outcome = { ok: false, message: error instanceof Error ? error.message : String(error) };
		}
		saveJobRun({
			name: info.name,
			startedAt,
			finishedAt: Date.now(),
			ok: outcome.ok,
			outcome: outcome.message
		});
		if (outcome.ok) console.info(`[jobs] ${info.name}: ${outcome.message}`);
		else console.error(`[jobs] ${info.name} failed: ${outcome.message}`);
	});
}

export type JobStatus = {
	name: string;
	title: string;
	when: string;
	busy: boolean;
	lastRun: { at: number; ok: boolean; outcome: string } | null;
	nextRun: number | null;
};

/** The scheduled jobs, in the order they were started, with their latest recorded run. */
export function listJobs(): JobStatus[] {
	const runs = listJobRuns();
	return [...jobs.values()].map((info) => {
		const job = scheduledJobs.find((j) => j.name === info.name);
		const run = runs.get(info.name);
		return {
			name: info.name,
			title: info.title,
			when: info.when,
			busy: job?.isBusy() ?? false,
			lastRun: run ? { at: run.finishedAt, ok: run.ok, outcome: run.outcome } : null,
			nextRun: job?.nextRun()?.getTime() ?? null
		};
	});
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

export function startJobs() {
	schedule(
		{
			name: 'refresh-tokens',
			title: 'Renew sign-ins to social media before they expire',
			when: 'Daily at 03:17',
			pattern: '17 3 * * *'
		},
		async () => {
			const results = await refreshExpiringTokens(listIntegrations().map((e) => e.integration));
			const failed = results.filter((r) => !r.ok);
			if (failed.length)
				return {
					ok: false,
					message: failed.map((r) => `${r.platform}: ${r.error}`).join('; ')
				};
			return done(
				results.length
					? `Renewed ${results.map((r) => r.platform).join(', ')}.`
					: 'Nothing was close to expiring.'
			);
		}
	);

	schedule(
		{
			name: 'sync-repo',
			title: 'Sync the posts repository',
			when: 'Every 5 minutes',
			pattern: '*/5 * * * *'
		},
		async () => (await syncRepo()) ?? done('Skipped: no posts repository is set up.')
	);

	schedule(
		{
			name: 'fetch-sources',
			title: 'Read new articles and videos from content sources',
			when: 'Every 30 minutes',
			pattern: '*/30 * * * *'
		},
		async () => {
			const r = await fetchAllSources();
			const images = await findPageImages();
			const message = `Read ${plural(r.fetched, 'source')}${r.failed ? `; ${plural(r.failed, 'source')} could not be read` : ''}. Found ${plural(images.found, 'preview picture')} on ${plural(images.looked, 'page')}.`;
			return { ok: r.failed === 0, message };
		}
	);

	schedule(
		{
			name: 'import-google-contacts',
			title: 'Add new contacts from Google Contacts',
			when: 'When the server starts, then hourly',
			pattern: '* * * * * *',
			options: { interval: 60 * 60 }
		},
		async () => {
			if (!isGoogleConnected()) return done('Skipped: Google Contacts is not connected.');
			const r = await importGoogleContacts();
			return done(
				`Added ${plural(r.created, 'new contact')}; ${r.existing.toLocaleString()} already here${r.deleted ? `, ${r.deleted.toLocaleString()} deleted by you` : ''}${r.skippedPhones ? `, ${plural(r.skippedPhones, 'phone number')} skipped` : ''}.`
			);
		}
	);

	schedule(
		{
			name: 'import-youtube-subscriptions',
			title: 'Import YouTube subscriptions, then sort the new ones with AI',
			when: 'When the server starts, then hourly',
			pattern: '* * * * * *',
			options: { interval: 60 * 60 }
		},
		async () => {
			if (!isYouTubeConnected()) return done('Skipped: YouTube is not connected.');
			const r = await fetchSubscriptions();
			const imported = `Imported ${plural(r.total, 'subscription')}, ${r.new.toLocaleString()} new.`;
			const sorted = await sortYouTubeChannels();
			return { ok: sorted.ok, message: `${imported} ${sorted.message}` };
		}
	);

	schedule(
		{
			name: 'import-reddit-subscriptions',
			title: 'Add the subreddits and people you follow on Reddit',
			when: 'When the server starts, then hourly',
			pattern: '* * * * * *',
			options: { interval: 60 * 60 }
		},
		async () => {
			if (!isRedditConnected()) return done('Skipped: Reddit is not connected.');
			const r = await importRedditSubscriptions();
			return done(
				`Follows ${r.total.toLocaleString()} on Reddit; added ${r.added.toLocaleString()}.`
			);
		}
	);

	schedule(
		{
			name: 'fetch-avatars',
			title: 'Download pictures from Google Contacts and YouTube',
			when: 'When the server starts, then hourly',
			pattern: '* * * * * *',
			options: { interval: 60 * 60 }
		},
		async () => {
			const r = await fetchMissingAvatars();
			const message = `Downloaded ${plural(r.saved, 'picture')}; ${r.withoutPicture.toLocaleString()} without one${r.failed ? `, ${r.failed.toLocaleString()} failed` : ''}.`;
			return { ok: r.failed === 0, message };
		}
	);

	schedule(
		{
			name: 'sort-youtube-channels',
			title: 'Sort YouTube channels still waiting for AI',
			when: 'Every 15 minutes',
			pattern: '*/15 * * * *'
		},
		sortYouTubeChannels
	);
}

async function sortYouTubeChannels(): Promise<Outcome> {
	if (!claudeReady()) return done('Sorting skipped: AI is not set up.');
	try {
		const r = await sortChannels();
		return done(
			r.sorted || r.added
				? `AI sorted ${plural(r.sorted, 'channel')}; ${r.added.toLocaleString()} added.`
				: 'No channels waiting for AI.'
		);
	} catch (error) {
		return {
			ok: false,
			message: `Sorting failed: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
