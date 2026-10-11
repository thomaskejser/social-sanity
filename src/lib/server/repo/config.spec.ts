import { describe, expect, it } from 'vitest';
import { parseRepoForm, validateBranch, validateCloneUrl, validatePostsDir } from './config.ts';

describe('validateCloneUrl', () => {
	it('accepts HTTPS, SSH and scp-style URLs', () => {
		expect(validateCloneUrl('https://github.com/me/posts.git')).toBeUndefined();
		expect(validateCloneUrl('ssh://git@github.com/me/posts.git')).toBeUndefined();
		expect(validateCloneUrl('git@github.com:me/posts.git')).toBeUndefined();
		expect(validateCloneUrl('http://localhost:8080/posts.git')).toBeUndefined();
	});

	it('rejects transports that can run commands or read local files', () => {
		expect(validateCloneUrl('ext::sh -c touch% /tmp/pwned')).toBeDefined();
		expect(validateCloneUrl('file:///etc')).toBeDefined();
		expect(validateCloneUrl('/srv/repos/posts.git')).toBeDefined();
		expect(validateCloneUrl('--upload-pack=touch /tmp/x')).toBeDefined();
		expect(validateCloneUrl('git://example.com/posts.git')).toBeDefined();
	});

	it('rejects plain HTTP to other hosts and credentials in the URL', () => {
		expect(validateCloneUrl('http://example.com/posts.git')).toMatch(/https/);
		expect(validateCloneUrl('https://me:secret@github.com/me/posts.git')).toMatch(/credentials/);
		expect(validateCloneUrl('https://ghp_token@github.com/me/posts.git')).toMatch(/credentials/);
	});
});

describe('branch and folder', () => {
	it('validates branch names', () => {
		expect(validateBranch('main')).toBeUndefined();
		expect(validateBranch('social/posts')).toBeUndefined();
		for (const bad of ['-x', 'a..b', 'a/', 'x.lock', 'a b', '']) {
			expect(validateBranch(bad)).toBeDefined();
		}
	});

	it('keeps the posts folder inside the repository', () => {
		expect(validatePostsDir('')).toBeUndefined();
		expect(validatePostsDir('content/social')).toBeUndefined();
		for (const bad of ['../x', 'a/../../b', '/abs', 'a//b', 'a b']) {
			expect(validatePostsDir(bad)).toBeDefined();
		}
	});
});

describe('parseRepoForm', () => {
	const form = (fields: Record<string, string>) => {
		const data = new FormData();
		for (const [key, value] of Object.entries(fields)) data.set(key, value);
		return data;
	};

	it('fills defaults', () => {
		const result = parseRepoForm(
			form({ url: 'git@github.com:me/p.git', postsDir: '/posts/', authorEmail: 'me@x.io' })
		);
		expect(result).toEqual({
			ok: true,
			config: {
				url: 'git@github.com:me/p.git',
				branch: 'main',
				postsDir: 'posts',
				tokenEnvVar: null,
				tokenUsername: 'x-access-token',
				authorName: 'Social Sanity',
				authorEmail: 'me@x.io'
			}
		});
	});

	it('refuses a token for SSH URLs and reserved variable names', () => {
		const ssh = parseRepoForm(
			form({ url: 'git@github.com:me/p.git', tokenEnvVar: 'REPO_TOKEN', authorEmail: 'me@x.io' })
		);
		expect(ssh.ok ? null : ssh.errors.tokenEnvVar).toMatch(/only used with https/);
		const reserved = parseRepoForm(
			form({ url: 'https://h/p.git', tokenEnvVar: 'SESSION_SECRET', authorEmail: 'me@x.io' })
		);
		expect(reserved.ok ? null : reserved.errors.tokenEnvVar).toMatch(/used by Social Sanity/);
	});
});
