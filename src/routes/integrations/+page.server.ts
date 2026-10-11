import { rm } from 'node:fs/promises';
import { fail } from '@sveltejs/kit';
import { testFileServer } from '#lib/server/ftp/transfer.ts';
import { parseFtpForm, readPassword } from '#lib/server/ftp/config.ts';
import {
	deleteFtpServer,
	getFtpServer,
	recordFtpTest,
	saveFtpServer
} from '#lib/server/ftp/store.ts';
import { deleteAccount, listAccounts } from '#lib/server/integrations/accounts.ts';
import { redirectUriFor } from '#lib/server/integrations/redirect-uri.ts';
import { getIntegration, listIntegrations } from '#lib/server/integrations/registry.ts';
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

export const load: PageServerLoad = ({ url }) => {
	const accounts = listAccounts();
	const connectedId = url.searchParams.get('connected');
	const ftp = getFtpServer();
	const repo = getGitRepo();

	return {
		error: url.searchParams.get('error'),
		connected: connectedId ? (getIntegration(connectedId)?.integration.name ?? null) : null,
		integrations: listIntegrations().map(({ integration, configured }) => {
			const account = accounts.find((a) => a.platform === integration.id);
			return {
				id: integration.id,
				name: integration.name,
				note: integration.note ?? null,
				consoleUrl: integration.consoleUrl,
				requiredEnv: integration.requiredEnv,
				redirectUri: redirectUriFor(integration.id, url.origin),
				autoRefresh: !!integration.refresh,
				configured,
				// Never send tokens to the browser — only metadata.
				account: account
					? {
							displayName: account.displayName,
							expiresAt: account.expiresAt,
							connectedAt: account.connectedAt,
							scopes: account.scopes.split(' ').filter(Boolean)
						}
					: null
			};
		}),
		ftp: ftp
			? {
					protocol: ftp.protocol,
					host: ftp.host,
					port: ftp.port,
					username: ftp.username,
					passwordEnvVar: ftp.passwordEnvVar,
					encryption: ftp.encryption,
					remoteDir: ftp.remoteDir,
					publicUrl: ftp.publicUrl,
					hostKeyFingerprint: ftp.hostKeyFingerprint,
					// Only whether the variable is set — never its value.
					passwordSet: readPassword(ftp.passwordEnvVar) !== undefined,
					lastTestedAt: ftp.lastTestedAt,
					lastTestOk: ftp.lastTestOk,
					lastTestMessage: ftp.lastTestMessage
				}
			: null,
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
	disconnect: async ({ request }) => {
		const platform = (await request.formData()).get('platform');
		if (typeof platform !== 'string' || !getIntegration(platform)) {
			return fail(400, { error: 'Unknown integration.' });
		}
		deleteAccount(platform);
		return { disconnected: getIntegration(platform)!.integration.name };
	},

	saveFtp: async ({ request }) => {
		const result = parseFtpForm(await request.formData());
		if (!result.ok) return fail(400, { ftp: { values: result.values, errors: result.errors } });
		saveFtpServer(result.config);
		return { ftpSaved: true };
	},

	testFtp: async () => {
		const server = getFtpServer();
		if (!server) return fail(400, { error: 'Save the file server settings first.' });
		try {
			const { message, hostKeyFingerprint } = await testFileServer(server);
			recordFtpTest(true, message, hostKeyFingerprint);
			return { ftpTest: { ok: true, message } };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			recordFtpTest(false, message);
			return fail(502, { ftpTest: { ok: false, message } });
		}
	},

	removeFtp: async () => {
		deleteFtpServer();
		return { ftpRemoved: true };
	},

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
