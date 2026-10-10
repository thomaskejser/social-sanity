import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { Client } from 'basic-ftp';
import { readPassword, type FtpConfig } from './config.ts';

const TIMEOUT_MS = 15_000;

import { FileServerError } from './errors.ts';

/** Adds a plain-language hint to common low-level FTP failures. */
export function explainFtpError(
	message: string,
	config: Pick<FtpConfig, 'encryption' | 'host' | 'port'>
): string {
	const hint = (text: string) => `${message} — ${text}`;
	if (/ENOTFOUND|EAI_AGAIN/.test(message))
		return hint(`the host name ${config.host} could not be resolved.`);
	if (/ECONNREFUSED/.test(message))
		return hint(`nothing is accepting connections on ${config.host}:${config.port}.`);
	if (/ETIMEDOUT|Timeout/i.test(message))
		return hint('the server did not respond in time; check the host, port and firewall.');
	if (/^530/.test(message)) return hint('the username or password was rejected.');
	if (
		config.encryption === 'explicit' &&
		/^5\d\d .*(not (supported|understood|implemented)|unknown command)/i.test(message)
	)
		return hint('the server may not support FTPS (AUTH TLS); try another encryption setting.');
	if (/certificate|self[- ]signed|SSL|TLS/i.test(message))
		return hint('the TLS handshake failed; the server certificate may be self-signed or invalid.');
	return message;
}

async function withClient<T>(config: FtpConfig, run: (client: Client) => Promise<T>): Promise<T> {
	const password = readPassword(config.passwordEnvVar);
	if (password === undefined) {
		throw new FileServerError(`Environment variable ${config.passwordEnvVar} is not set.`);
	}
	const client = new Client(TIMEOUT_MS);
	try {
		await client.access({
			host: config.host,
			port: config.port,
			user: config.username,
			password,
			secure:
				config.encryption === 'none' ? false : config.encryption === 'implicit' ? 'implicit' : true
		});
		await client.ensureDir(config.remoteDir);
		return await run(client);
	} catch (error) {
		if (error instanceof FileServerError) throw error;
		throw new FileServerError(
			explainFtpError(error instanceof Error ? error.message : String(error), config)
		);
	} finally {
		client.close();
	}
}

/** Logs in, enters the remote directory, and writes then deletes a small file to prove write access. */
export async function testFtp(config: FtpConfig): Promise<string> {
	return withClient(config, async (client) => {
		const probe = `.social-sanity-test-${randomBytes(4).toString('hex')}.txt`;
		await client.uploadFrom(Readable.from(['Social Sanity connection test\n']), probe);
		await client.remove(probe);
		const dir = await client.pwd();
		return `Logged in as ${config.username} and wrote a test file to ${dir}.`;
	});
}

/** Uploads a file into the configured directory and returns its remote path. */
export async function uploadToFtp(
	config: FtpConfig,
	fileName: string,
	contents: Readable | Buffer
): Promise<string> {
	return withClient(config, async (client) => {
		await client.uploadFrom(
			Buffer.isBuffer(contents) ? Readable.from([contents]) : contents,
			fileName
		);
		return `${(await client.pwd()).replace(/\/$/, '')}/${fileName}`;
	});
}
