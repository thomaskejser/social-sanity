import { rm } from 'node:fs/promises';
import { fail } from '@sveltejs/kit';
import { parseRepoForm } from '#lib/server/repo/config.ts';
import { testRemote, unpushedCount, withRepoLock } from '#lib/server/repo/git.ts';
import {
	cloneDir,
	deleteGitRepo,
	getGitRepo,
	gitContext,
	recordSync,
	saveGitRepo,
	tokenSet
} from '#lib/server/repo/store.ts';
import { syncRepo } from '#lib/server/repo/sync.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const repo = getGitRepo();
	return {
		repo: repo
			? {
					url: repo.url,
					branch: repo.branch,
					postsDir: repo.postsDir,
					tokenEnvVar: repo.tokenEnvVar,
					tokenUsername: repo.tokenUsername,
					authorName: repo.authorName,
					authorEmail: repo.authorEmail,
					// Only whether the variable is set — never its value.
					tokenSet: tokenSet(repo),
					lastSyncAt: repo.lastSyncAt,
					lastSyncOk: repo.lastSyncOk,
					lastSyncMessage: repo.lastSyncMessage
				}
			: null
	};
};

export const actions: Actions = {
	saveRepo: async ({ request }) => {
		const result = parseRepoForm(await request.formData());
		if (!result.ok) return fail(400, { repo: { values: result.values, errors: result.errors } });
		saveGitRepo(result.config);
		const sync = await syncRepo();
		return { repoSaved: true, repoSync: sync };
	},

	testRepo: async () => {
		const repo = getGitRepo();
		if (!repo) return fail(400, { error: 'Save the repository settings first.' });
		try {
			const message = await withRepoLock(() => testRemote(gitContext(repo)));
			return { repoTest: { ok: true, message } };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			recordSync(false, message);
			return fail(502, { repoTest: { ok: false, message } });
		}
	},

	syncRepo: async () => {
		const sync = await syncRepo();
		if (!sync) return fail(400, { error: 'Save the repository settings first.' });
		return sync.ok ? { repoSync: sync } : fail(502, { repoSync: sync });
	},

	removeRepo: async () => {
		const repo = getGitRepo();
		if (!repo) return { repoRemoved: true };
		const pending = await withRepoLock(() => unpushedCount(gitContext(repo))).catch(() => 0);
		if (pending > 0) {
			return fail(409, {
				error: `The local clone has ${pending} commit${pending === 1 ? '' : 's'} that could not be pushed yet. Pull to push them before removing the repository.`
			});
		}
		await withRepoLock(() => rm(cloneDir(), { recursive: true, force: true }));
		deleteGitRepo();
		return { repoRemoved: true };
	}
};
