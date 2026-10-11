import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	commitAndPush,
	ensureClone,
	type GitContext,
	headSummary,
	sync,
	testRemote,
	unpushedCount
} from './git.ts';

let root: string;
let ctx: GitContext;

const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', ['-c', 'user.name=Other', '-c', 'user.email=o@x', ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' }
	}).trim();

/** A second clone standing in for someone editing the repository elsewhere. */
function otherClone(): string {
	const dir = path.join(root, `other-${Math.random().toString(36).slice(2)}`);
	git(root, 'clone', '--quiet', `file://${root}/remote.git`, dir);
	return dir;
}

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'git-spec-'));
	git(root, 'init', '--quiet', '--bare', '--initial-branch=main', 'remote.git');
	ctx = {
		dir: path.join(root, 'clone'),
		url: `file://${root}/remote.git`,
		branch: 'main',
		token: null,
		author: { name: 'Social Sanity', email: 'app@example.com' },
		allowedProtocols: 'file'
	};
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('git repository sync', () => {
	it('reports a missing branch on an empty repository and creates it on first push', async () => {
		expect(await testRemote(ctx)).toMatch(/doesn't exist yet/);
		await ensureClone(ctx);
		writeFileSync(path.join(ctx.dir, 'a.md'), 'Hello\n');
		expect(await commitAndPush(ctx, ['a.md'], 'Add a')).toEqual({
			committed: true,
			pushError: null
		});
		expect(await testRemote(ctx)).toMatch(/branch main found/);
		expect(git(otherClone(), 'log', '-1', '--format=%an %s')).toBe('Social Sanity Add a');
	});

	it('does not commit when nothing changed', async () => {
		await ensureClone(ctx);
		writeFileSync(path.join(ctx.dir, 'a.md'), 'Hello\n');
		await commitAndPush(ctx, ['a.md'], 'Add a');
		expect((await commitAndPush(ctx, ['a.md'], 'Again')).committed).toBe(false);
	});

	it('pulls changes made elsewhere', async () => {
		await ensureClone(ctx);
		writeFileSync(path.join(ctx.dir, 'a.md'), 'Hello\n');
		await commitAndPush(ctx, ['a.md'], 'Add a');

		const other = otherClone();
		writeFileSync(path.join(other, 'b.md'), 'From elsewhere\n');
		git(other, 'add', 'b.md');
		git(other, 'commit', '--quiet', '-m', 'Add b');
		git(other, 'push', '--quiet', 'origin', 'main');

		const result = await sync(ctx);
		expect(result.commit).toMatch(/Add b$/);
		expect(readFileSync(path.join(ctx.dir, 'b.md'), 'utf8')).toBe('From elsewhere\n');
	});

	it('rebases its own commit onto a concurrent push and pushes it', async () => {
		await ensureClone(ctx);
		writeFileSync(path.join(ctx.dir, 'a.md'), 'Hello\n');
		await commitAndPush(ctx, ['a.md'], 'Add a');

		const other = otherClone();
		writeFileSync(path.join(other, 'b.md'), 'Other\n');
		git(other, 'add', 'b.md');
		git(other, 'commit', '--quiet', '-m', 'Add b');
		git(other, 'push', '--quiet', 'origin', 'main');

		writeFileSync(path.join(ctx.dir, 'c.md'), 'Mine\n');
		expect((await commitAndPush(ctx, ['c.md'], 'Add c')).pushError).toBeNull();
		expect(await unpushedCount(ctx)).toBe(0);
		expect(git(otherClone(), 'log', '--format=%s')).toBe('Add c\nAdd b\nAdd a');
	});

	it('keeps an unpushed commit when the remote is unreachable and pushes it on the next sync', async () => {
		await ensureClone(ctx);
		const offline = { ...ctx, allowedProtocols: 'https' };
		writeFileSync(path.join(ctx.dir, 'a.md'), 'Hello\n');
		const result = await commitAndPush(offline, ['a.md'], 'Add a');
		expect(result.committed).toBe(true);
		expect(result.pushError).toMatch(/failed/);
		expect(await unpushedCount(ctx)).toBe(1);

		expect((await sync(ctx)).pushed).toBe(1);
		expect(await headSummary(ctx)).toMatch(/Add a$/);
	});

	it('refuses transports outside the allowed list', async () => {
		await expect(testRemote({ ...ctx, allowedProtocols: 'https:ssh' })).rejects.toThrow();
	});
});
