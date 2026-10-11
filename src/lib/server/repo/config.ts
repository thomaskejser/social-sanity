import { validateEnvVarName } from '../ftp/config.ts';

export type RepoConfig = {
	url: string;
	branch: string;
	postsDir: string;
	tokenEnvVar: string | null;
	tokenUsername: string;
	authorName: string;
	authorEmail: string;
};

export type RepoFormValues = Record<keyof RepoConfig, string>;
export type RepoFormErrors = Partial<Record<keyof RepoConfig, string>>;

const SCP_LIKE = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:(?!:)[^\s]+$/;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isHttpUrl(url: string): boolean {
	return /^https?:\/\//i.test(url);
}

/** Only HTTPS, SSH and scp-style URLs are accepted: git's other transports (ext::, file://)
 * can run commands or read the server's disk. Plain HTTP is allowed only to this machine. */
export function validateCloneUrl(url: string): string | undefined {
	if (!url) return 'Enter the clone URL of the repository.';
	if (url.startsWith('-') || /\s/.test(url)) return 'Not a valid clone URL.';
	if (SCP_LIKE.test(url)) return undefined;
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return 'Use an https://, ssh:// or git@host:path URL.';
	}
	if (parsed.protocol === 'http:' && !LOOPBACK.has(parsed.hostname)) {
		return 'Use https:// — plain http would send the token unencrypted.';
	}
	if (!['https:', 'http:', 'ssh:'].includes(parsed.protocol)) {
		return 'Use an https://, ssh:// or git@host:path URL.';
	}
	if (parsed.password || (isHttpUrl(url) && parsed.username)) {
		return 'Remove the credentials from the URL; put the token in an environment variable instead.';
	}
	return undefined;
}

export function validateBranch(branch: string): string | undefined {
	if (!branch) return 'Enter a branch name.';
	if (
		!/^[A-Za-z0-9._/-]+$/.test(branch) ||
		branch.startsWith('-') ||
		branch.startsWith('/') ||
		branch.endsWith('/') ||
		branch.endsWith('.lock') ||
		branch.includes('..') ||
		branch.includes('//')
	) {
		return 'Not a valid branch name.';
	}
	return undefined;
}

export function validatePostsDir(dir: string): string | undefined {
	if (dir === '') return undefined;
	const segments = dir.split('/');
	if (segments.some((s) => s === '' || s === '.' || s === '..' || !/^[A-Za-z0-9._-]+$/.test(s))) {
		return 'Use a folder path inside the repository, e.g. posts or content/social.';
	}
	return undefined;
}

function field(form: FormData, name: keyof RepoConfig): string {
	const value = form.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

export function parseRepoForm(
	form: FormData
):
	{ ok: true; config: RepoConfig } | { ok: false; values: RepoFormValues; errors: RepoFormErrors } {
	const values: RepoFormValues = {
		url: field(form, 'url'),
		branch: field(form, 'branch') || 'main',
		postsDir: field(form, 'postsDir').replace(/^\/+|\/+$/g, ''),
		tokenEnvVar: field(form, 'tokenEnvVar'),
		tokenUsername: field(form, 'tokenUsername') || 'x-access-token',
		authorName: field(form, 'authorName') || 'Social Sanity',
		authorEmail: field(form, 'authorEmail')
	};
	const errors: RepoFormErrors = {};

	const urlError = validateCloneUrl(values.url);
	if (urlError) errors.url = urlError;
	const branchError = validateBranch(values.branch);
	if (branchError) errors.branch = branchError;
	const dirError = validatePostsDir(values.postsDir);
	if (dirError) errors.postsDir = dirError;
	if (values.tokenEnvVar) {
		const envError = validateEnvVarName(values.tokenEnvVar);
		if (envError) errors.tokenEnvVar = envError;
		else if (!urlError && !isHttpUrl(values.url)) {
			errors.tokenEnvVar = 'Tokens are only used with https:// URLs; SSH uses this machine’s keys.';
		}
	}
	if (!/^[^\s:@/]+$/.test(values.tokenUsername)) errors.tokenUsername = 'Not a valid username.';
	if (/[\n<>]/.test(values.authorName)) errors.authorName = 'Not a valid name.';
	if (!/^[^\s<>@]+@[^\s<>@]+$/.test(values.authorEmail)) {
		errors.authorEmail = 'Enter the email address commits should be attributed to.';
	}

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return { ok: true, config: { ...values, tokenEnvVar: values.tokenEnvVar || null } };
}
