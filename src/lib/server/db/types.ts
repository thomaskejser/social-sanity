import type { FileServerProtocol, FtpEncryption } from '../ftp/config.ts';

/** One connected social account per platform, authorised via OAuth. Tokens are encrypted at rest. */
export type Account = {
	platform: string;
	externalId: string;
	displayName: string;
	accessTokenEnc: string;
	refreshTokenEnc: string | null;
	/** Access token expiry, epoch milliseconds. Null when the platform does not report one. */
	expiresAt: number | null;
	scopes: string;
	connectedAt: number;
	refreshedAt: number;
};

/** The FTP/SFTP server files are uploaded to. The password is never stored — only the name of
 * the environment variable that holds it. */
export type FtpServer = {
	id: number;
	protocol: FileServerProtocol;
	host: string;
	port: number;
	username: string;
	passwordEnvVar: string;
	/** FTP only; ignored for SFTP, which is always encrypted. */
	encryption: FtpEncryption;
	/** SFTP only: SHA-256 fingerprint of the server's host key, pinned on the first successful test. */
	hostKeyFingerprint: string | null;
	remoteDir: string;
	publicUrl: string | null;
	lastTestedAt: number | null;
	lastTestOk: boolean | null;
	lastTestMessage: string | null;
	updatedAt: number;
};

/** The git repository posts are read from and written to. An HTTPS token is never stored — only
 * the name of the environment variable that holds it. */
export type GitRepo = {
	id: number;
	url: string;
	branch: string;
	postsDir: string;
	tokenEnvVar: string | null;
	tokenUsername: string;
	authorName: string;
	authorEmail: string;
	lastSyncAt: number | null;
	lastSyncOk: boolean | null;
	lastSyncMessage: string | null;
	updatedAt: number;
};

/** Publishing in progress or failed, per post and platform. Successful publishes are recorded
 * in the post's Markdown file instead; `unrecorded` holds one that succeeded but could not be
 * written to the repository yet. `postId` is the post's path in the posts folder. */
export type PublishAttempt = {
	postId: string;
	platform: string;
	status: 'publishing' | 'failed' | 'unrecorded';
	error: string | null;
	remoteId: string | null;
	remoteUrl: string | null;
	publishedAt: number | null;
	updatedAt: number;
};
