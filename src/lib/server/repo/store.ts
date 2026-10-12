import path from 'node:path';
import { eq } from 'drizzle-orm';
import { REPO_DIR } from '$app/env/private';
import { db } from '../db/index.ts';
import { gitRepo, type GitRepo } from '../db/schema.ts';
import { readPassword } from '../ftp/config.ts';
import type { RepoConfig } from './config.ts';
import type { GitContext } from './git.ts';

const ROW_ID = 1;

export class RepoNotConfiguredError extends Error {
	constructor() {
		super('No posts repository is configured. Add one on the Settings page.');
	}
}

export function getGitRepo(): GitRepo | undefined {
	return db.select().from(gitRepo).where(eq(gitRepo.id, ROW_ID)).get();
}

export function saveGitRepo(config: RepoConfig, now = Date.now()) {
	const row = {
		...config,
		id: ROW_ID,
		updatedAt: now,
		lastSyncAt: null,
		lastSyncOk: null,
		lastSyncMessage: null
	};
	db.insert(gitRepo).values(row).onConflictDoUpdate({ target: gitRepo.id, set: row }).run();
}

export function recordSync(ok: boolean, message: string, now = Date.now()) {
	db.update(gitRepo)
		.set({ lastSyncAt: now, lastSyncOk: ok, lastSyncMessage: message })
		.where(eq(gitRepo.id, ROW_ID))
		.run();
}

export function deleteGitRepo() {
	db.delete(gitRepo).where(eq(gitRepo.id, ROW_ID)).run();
}

export function cloneDir(): string {
	return path.resolve(REPO_DIR);
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
