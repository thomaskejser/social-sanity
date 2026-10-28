import path from 'node:path';
import { SOCIAL_SANITY_REPO_DIR } from '$app/env/private';
import { db, flag, fromFlag } from '../db/index.ts';
import type { GitRepo } from '../db/types.ts';
import { readPassword } from '../ftp/config.ts';
import type { RepoConfig } from './config.ts';
import type { GitContext } from './git.ts';
import getSql from './sql/get-git-repo.sql?raw';
import saveSql from './sql/save-git-repo.sql?raw';
import recordSyncSql from './sql/record-sync.sql?raw';
import deleteSql from './sql/delete-git-repo.sql?raw';

const getStatement = db.prepare<[], Omit<GitRepo, 'lastSyncOk'> & { lastSyncOk: number | null }>(
	getSql
);
const saveStatement = db.prepare(saveSql);
const recordSyncStatement = db.prepare(recordSyncSql);
const deleteStatement = db.prepare(deleteSql);

export class RepoNotConfiguredError extends Error {
	constructor() {
		super('No posts repository is configured. Add one on the Settings page.');
	}
}

export function getGitRepo(): GitRepo | undefined {
	const row = getStatement.get();
	return row && { ...row, lastSyncOk: fromFlag(row.lastSyncOk) };
}

export function saveGitRepo(config: RepoConfig, now = Date.now()) {
	saveStatement.run({
		url: config.url,
		branch: config.branch,
		posts_dir: config.postsDir,
		token_env_var: config.tokenEnvVar,
		token_username: config.tokenUsername,
		author_name: config.authorName,
		author_email: config.authorEmail,
		updated_at: now
	});
}

export function recordSync(ok: boolean, message: string, now = Date.now()) {
	recordSyncStatement.run({ synced_at: now, ok: flag(ok), message });
}

export function deleteGitRepo() {
	deleteStatement.run();
}

export function cloneDir(): string {
	return path.resolve(SOCIAL_SANITY_REPO_DIR);
}

/** Absolute path of the posts folder inside the clone. */
export function postsRoot(repo: GitRepo): string {
	return path.join(cloneDir(), repo.postsDir);
}

export function tokenSet(repo: GitRepo): boolean {
	return !repo.tokenEnvVar || readPassword(repo.tokenEnvVar) !== undefined;
}

export function gitContext(repo: GitRepo): GitContext {
	const token = repo.tokenEnvVar ? readPassword(repo.tokenEnvVar) : undefined;
	if (repo.tokenEnvVar && !token) {
		throw new Error(`${repo.tokenEnvVar} is not set. Add it to the environment and restart.`);
	}
	return {
		dir: cloneDir(),
		url: repo.url,
		branch: repo.branch,
		token: token ? { username: repo.tokenUsername, value: token } : null,
		author: { name: repo.authorName, email: repo.authorEmail }
	};
}

export function requireRepo(): GitRepo {
	const repo = getGitRepo();
	if (!repo) throw new RepoNotConfiguredError();
	return repo;
}
