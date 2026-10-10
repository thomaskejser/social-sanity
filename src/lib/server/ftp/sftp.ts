import { createHash, randomBytes } from 'node:crypto';
import { posix } from 'node:path';
import { Readable } from 'node:stream';
import SftpClient from 'ssh2-sftp-client';
import { readPassword, type FtpConfig } from './config.ts';
import { FileServerError } from './errors.ts';

const TIMEOUT_MS = 15_000;

export function fingerprint(hostKey: Buffer): string {
	return `SHA256:${createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '')}`;
}

/** Adds a plain-language hint to common SSH/SFTP failures. */
export function explainSftpError(
	message: string,
	config: Pick<FtpConfig, 'host' | 'port'>
): string {
	const hint = (text: string) => `${message} — ${text}`;
	if (/ENOTFOUND|EAI_AGAIN/.test(message))
		return hint(`the host name ${config.host} could not be resolved.`);
	if (/ECONNREFUSED/.test(message))
		return hint(`nothing is accepting connections on ${config.host}:${config.port}.`);
	if (/ETIMEDOUT|timed out/i.test(message))
		return hint('the server did not respond in time; check the host, port and firewall.');
	if (/authentication methods failed|All configured authentication/i.test(message))
		return hint('the username or password was rejected.');
	return message;
}

type SftpSession = { client: SftpClient; hostKeyFingerprint: string };

/**
 * Connects with trust-on-first-use host key pinning: with no pinned key the server's key is
 * accepted and reported back; with a pinned key any other key is refused (possible MITM).
 */
async function withSftp<T>(
	config: FtpConfig,
	pinnedFingerprint: string | null,
	run: (session: SftpSession) => Promise<T>
): Promise<T> {
	const password = readPassword(config.passwordEnvVar);
	if (password === undefined) {
		throw new FileServerError(`Environment variable ${config.passwordEnvVar} is not set.`);
	}

	const client = new SftpClient();
	let seen: string | undefined;
	try {
		await client.connect({
			host: config.host,
			port: config.port,
			username: config.username,
			password,
			readyTimeout: TIMEOUT_MS,
			hostVerifier: (key: Buffer) => {
				seen = fingerprint(key);
				return pinnedFingerprint === null || seen === pinnedFingerprint;
			}
		});
		const remoteDir = config.remoteDir;
		if (!(await client.exists(remoteDir))) await client.mkdir(remoteDir, true);
		return await run({ client, hostKeyFingerprint: seen! });
	} catch (error) {
		if (error instanceof FileServerError) throw error;
		if (pinnedFingerprint && seen && seen !== pinnedFingerprint) {
			throw new FileServerError(
				`The server's host key changed (expected ${pinnedFingerprint}, got ${seen}). This can mean someone is intercepting the connection. If the server was reinstalled, save the settings again to re-pin the key.`
			);
		}
		const message = error instanceof Error ? error.message : String(error);
		throw new FileServerError(explainSftpError(message, config));
	} finally {
		await client.end().catch(() => {});
	}
}

export async function testSftp(
	config: FtpConfig,
	pinnedFingerprint: string | null
): Promise<{ message: string; hostKeyFingerprint: string }> {
	return withSftp(config, pinnedFingerprint, async ({ client, hostKeyFingerprint }) => {
		const probe = posix.join(
			config.remoteDir,
			`.social-sanity-test-${randomBytes(4).toString('hex')}.txt`
		);
		await client.put(Buffer.from('Social Sanity connection test\n'), probe);
		await client.delete(probe);
		const pinned = pinnedFingerprint ? '' : ` Host key ${hostKeyFingerprint} is now pinned.`;
		return {
			message: `Logged in as ${config.username} and wrote a test file to ${config.remoteDir}.${pinned}`,
			hostKeyFingerprint
		};
	});
}

export async function uploadSftp(
	config: FtpConfig,
	pinnedFingerprint: string | null,
	fileName: string,
	contents: Readable | Buffer
): Promise<string> {
	return withSftp(config, pinnedFingerprint, async ({ client }) => {
		const remotePath = posix.join(config.remoteDir, fileName);
		await client.put(contents, remotePath);
		return remotePath;
	});
}
