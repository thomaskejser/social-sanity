import type { Readable } from 'node:stream';
import { testFtp, uploadToFtp } from './client.ts';
import type { FtpConfig } from './config.ts';
import { FileServerError } from './errors.ts';
import { testSftp, uploadSftp } from './sftp.ts';

export type FileServer = FtpConfig & { hostKeyFingerprint: string | null };

/** Tests the configured server over FTP or SFTP. For SFTP, returns the host key to pin. */
export async function testFileServer(
	server: FileServer
): Promise<{ message: string; hostKeyFingerprint: string | null }> {
	if (server.protocol === 'sftp') return testSftp(server, server.hostKeyFingerprint);
	return { message: await testFtp(server), hostKeyFingerprint: null };
}

/** Uploads a file to the configured server. Returns its public URL when one is configured. */
export async function uploadToFileServer(
	server: FileServer,
	fileName: string,
	contents: Readable | Buffer
): Promise<{ remotePath: string; publicUrl: string | null }> {
	if (fileName.includes('/') || fileName.startsWith('.'))
		throw new FileServerError('Invalid file name.');
	if (server.protocol === 'sftp') {
		if (!server.hostKeyFingerprint) {
			throw new FileServerError('Run "Test connection" first to pin the SFTP host key.');
		}
		const remotePath = await uploadSftp(server, server.hostKeyFingerprint, fileName, contents);
		return { remotePath, publicUrl: publicUrlFor(server, fileName) };
	}
	const remotePath = await uploadToFtp(server, fileName, contents);
	return { remotePath, publicUrl: publicUrlFor(server, fileName) };
}

function publicUrlFor(server: FtpConfig, fileName: string): string | null {
	return server.publicUrl ? `${server.publicUrl}/${encodeURIComponent(fileName)}` : null;
}
