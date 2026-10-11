import { recordPendingPublishes } from '../publish/service.ts';
import { sync, withRepoLock } from './git.ts';
import { getGitRepo, gitContext, recordSync } from './store.ts';

/** Pulls (and pushes pending commits) when a repository is configured, records the outcome,
 * and saves publishes that could not be written to the repository earlier. */
export async function syncRepo(): Promise<{ ok: boolean; message: string } | null> {
	const repo = getGitRepo();
	if (!repo) return null;
	try {
		const result = await withRepoLock(() => sync(gitContext(repo)));
		const message =
			result.pushed > 0
				? `Pulled ${result.commit}; pushed ${result.pushed} pending commit${result.pushed === 1 ? '' : 's'}.`
				: `Up to date at ${result.commit}.`;
		recordSync(true, message);
		await recordPendingPublishes(repo);
		return { ok: true, message };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		recordSync(false, message);
		return { ok: false, message };
	}
}
