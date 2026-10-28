import { db, flag, fromFlag } from '../db/index.ts';
import type { FtpServer } from '../db/types.ts';
import type { FtpConfig } from './config.ts';
import getSql from './sql/get-ftp-server.sql?raw';
import saveSql from './sql/save-ftp-server.sql?raw';
import recordTestSql from './sql/record-ftp-test.sql?raw';
import deleteSql from './sql/delete-ftp-server.sql?raw';

const getStatement = db.prepare<[], Omit<FtpServer, 'lastTestOk'> & { lastTestOk: number | null }>(
	getSql
);
const saveStatement = db.prepare(saveSql);
const recordTestStatement = db.prepare(recordTestSql);
const deleteStatement = db.prepare(deleteSql);

export function getFtpServer(): FtpServer | undefined {
	const row = getStatement.get();
	return row && { ...row, lastTestOk: fromFlag(row.lastTestOk) };
}

export function saveFtpServer(config: FtpConfig, now = Date.now()) {
	saveStatement.run({
		protocol: config.protocol,
		host: config.host,
		port: config.port,
		username: config.username,
		password_env_var: config.passwordEnvVar,
		encryption: config.encryption,
		remote_dir: config.remoteDir,
		public_url: config.publicUrl,
		updated_at: now
	});
}

export function recordFtpTest(
	ok: boolean,
	message: string,
	hostKeyFingerprint?: string | null,
	now = Date.now()
) {
	recordTestStatement.run({
		tested_at: now,
		ok: flag(ok),
		message,
		host_key_fingerprint: hostKeyFingerprint ?? null
	});
}

export function deleteFtpServer() {
	deleteStatement.run();
}
