import { execFile } from 'node:child_process';
import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export class GitError extends Error {}

export type GitContext = {
	dir: string;
	url: string;
	branch: string;
	token: { username: string; value: string } | null;
	author: { name: string; email: string };
	/** Transports git may use (GIT_ALLOW_PROTOCOL). Tests add `file`. */
	allowedProtocols?: string;
	timeoutMs?: number;
};

/** The token reaches git through GIT_CONFIG_* variables, never argv, so it doesn't show up in
 * process listings. The user's global and system git config are ignored. */
function gitEnv(ctx: GitContext): NodeJS.ProcessEnv {
	const config: [string, string][] = [
		['http.followRedirects', 'false'],
		['credential.helper', ''],
		['core.hooksPath', '/dev/null']
	];
	if (ctx.token) {
		const basic = Buffer.from(`${ctx.token.username}:${ctx.token.value}`).toString('base64');
		config.push(['http.extraHeader', `Authorization: Basic ${basic}`]);
	}
	const env: NodeJS.ProcessEnv = {
		...process.env,
		GIT_TERMINAL_PROMPT: '0',
		GIT_ALLOW_PROTOCOL: ctx.allowedProtocols ?? 'https:http:ssh',
		GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new',
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CONFIG_GLOBAL: '/dev/null',
		LC_ALL: 'C',
		GIT_CONFIG_COUNT: String(config.length)
	};
	config.forEach(([key, value], i) => {
		env[`GIT_CONFIG_KEY_${i}`] = key;
		env[`GIT_CONFIG_VALUE_${i}`] = value;
	});
	return env;
}

function run(
	ctx: GitContext,
	args: string[],
	options: { cwd?: string; allowFailure?: boolean } = {}
): Promise<{ stdout: string; code: number }> {
	return new Promise((resolve, reject) => {
		execFile(
			'git',
			args,
			{
				cwd: options.cwd ?? ctx.dir,
				env: gitEnv(ctx),
				timeout: ctx.timeoutMs ?? 120_000,
				maxBuffer: 16 * 1024 * 1024
			},
			(error, stdout, stderr) => {
				if (!error) return resolve({ stdout: stdout.trim(), code: 0 });
				const code = typeof error.code === 'number' ? error.code : -1;
				if (options.allowFailure && code > 0) return resolve({ stdout: stdout.trim(), code });
				const detail = (stderr || error.message).trim().split('\n').slice(-3).join(' ');
				reject(new GitError(`git ${args[0]} failed: ${detail}`));
			}
		);
	});
}

const authorArgs = (ctx: GitContext) => [
	'-c',
	`user.name=${ctx.author.name}`,
	'-c',
	`user.email=${ctx.author.email}`
];

let queue: Promise<unknown> = Promise.resolve();

/** Runs `task` after every earlier repo task has finished, so git never runs concurrently. */
export function withRepoLock<T>(task: () => Promise<T>): Promise<T> {
	const result = queue.then(task, task);
	queue = result.catch(() => undefined);
	return result;
}

async function exists(file: string): Promise<boolean> {
	return access(file).then(
		() => true,
		() => false
	);
}

/** Whether `branch` exists on the remote; throws when the remote can't be reached. */
export async function remoteHasBranch(ctx: GitContext): Promise<boolean> {
	const { code } = await run(
		ctx,
		['ls-remote', '--exit-code', '--heads', '--', ctx.url, `refs/heads/${ctx.branch}`],
		{ cwd: path.dirname(path.resolve(ctx.dir)), allowFailure: true }
	);
	if (code === 2) return false;
	if (code !== 0) throw new GitError('git ls-remote failed.');
	return true;
}

export async function testRemote(ctx: GitContext): Promise<string> {
	await mkdir(path.dirname(path.resolve(ctx.dir)), { recursive: true });
	return (await remoteHasBranch(ctx))
		? `Connected; branch ${ctx.branch} found.`
		: `Connected, but branch ${ctx.branch} doesn't exist yet. It is created on the first push.`;
}

/** Makes `ctx.dir` a clone of the configured URL and branch, recloning when they changed. */
export async function ensureClone(ctx: GitContext) {
	const dir = path.resolve(ctx.dir);
	if (await exists(path.join(dir, '.git'))) {
		const origin = await run(ctx, ['remote', 'get-url', 'origin'], { allowFailure: true });
		const branch = await run(ctx, ['symbolic-ref', '--short', 'HEAD'], { allowFailure: true });
		if (origin.stdout === ctx.url && branch.stdout === ctx.branch) return;
		if ((await unpushedCount(ctx)) > 0) {
			throw new GitError(
				'The repository settings changed, but the local clone has commits that were never pushed.'
			);
		}
		await rm(dir, { recursive: true, force: true });
	}
	await mkdir(path.dirname(dir), { recursive: true });
	if (await remoteHasBranch(ctx)) {
		await run(ctx, ['clone', '--branch', ctx.branch, '--single-branch', '--', ctx.url, dir], {
			cwd: path.dirname(dir)
		});
	} else {
		await run(ctx, ['clone', '--', ctx.url, dir], { cwd: path.dirname(dir) });
		await run(ctx, ['checkout', '--orphan', ctx.branch]);
	}
}

async function hasRemoteBranchLocally(ctx: GitContext): Promise<boolean> {
	const { code } = await run(
		ctx,
		['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${ctx.branch}`],
		{ allowFailure: true }
	);
	return code === 0;
}

export async function unpushedCount(ctx: GitContext): Promise<number> {
	const head = await run(ctx, ['rev-parse', '--verify', '--quiet', 'HEAD'], { allowFailure: true });
	if (head.code !== 0) return 0;
	const range = (await hasRemoteBranchLocally(ctx)) ? `origin/${ctx.branch}..HEAD` : 'HEAD';
	return Number((await run(ctx, ['rev-list', '--count', range])).stdout);
}

async function push(ctx: GitContext) {
	await run(ctx, ['push', 'origin', `HEAD:refs/heads/${ctx.branch}`]);
	await run(ctx, ['fetch', 'origin', ctx.branch], { allowFailure: true });
}

async function integrateRemote(ctx: GitContext) {
	if (!(await remoteHasBranch(ctx))) return;
	await run(ctx, ['fetch', 'origin', ctx.branch]);
	const head = await run(ctx, ['rev-parse', '--verify', '--quiet', 'HEAD'], { allowFailure: true });
	if (head.code !== 0) {
		await run(ctx, ['checkout', '-B', ctx.branch, `origin/${ctx.branch}`]);
		return;
	}
	const rebase = await run(ctx, [...authorArgs(ctx), 'rebase', `origin/${ctx.branch}`], {
		allowFailure: true
	});
	if (rebase.code !== 0) {
		await run(ctx, ['rebase', '--abort'], { allowFailure: true });
		throw new GitError(
			'Local changes conflict with changes in the repository. Resolve the conflict in the repository, then pull again.'
		);
	}
}

export type SyncResult = { commit: string; pushed: number };

/** Pulls the branch, rebasing commits not pushed yet, then pushes them. */
export async function sync(ctx: GitContext): Promise<SyncResult> {
	await ensureClone(ctx);
	const status = await run(ctx, ['status', '--porcelain']);
	if (status.stdout) {
		throw new GitError(
			'The local clone has uncommitted changes; remove and re-add the repository.'
		);
	}
	await integrateRemote(ctx);
	const pending = await unpushedCount(ctx);
	if (pending > 0) await push(ctx);
	return { commit: await headSummary(ctx), pushed: pending };
}

export async function headSummary(ctx: GitContext): Promise<string> {
	const { stdout, code } = await run(ctx, ['log', '-1', '--format=%h %s'], { allowFailure: true });
	return code === 0 ? stdout : '(no commits yet)';
}

/** Commits the given paths (relative to the clone) and pushes. A failed push leaves the commit
 * in place for the next sync and is reported in `pushError`. */
export async function commitAndPush(
	ctx: GitContext,
	paths: string[],
	message: string
): Promise<{ committed: boolean; pushError: string | null }> {
	await run(ctx, ['add', '--all', '--', ...paths]);
	const staged = await run(ctx, ['diff', '--cached', '--quiet'], { allowFailure: true });
	if (staged.code === 0) return { committed: false, pushError: null };
	await run(ctx, [...authorArgs(ctx), 'commit', '--quiet', '-m', message]);
	try {
		await push(ctx);
	} catch {
		try {
			await integrateRemote(ctx);
			await push(ctx);
		} catch (error) {
			return { committed: true, pushError: error instanceof Error ? error.message : String(error) };
		}
	}
	return { committed: true, pushError: null };
}
