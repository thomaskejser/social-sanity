import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { ftpServer, type FtpServer } from '../db/schema.ts';
import type { FtpConfig } from './config.ts';

const ROW_ID = 1;

export function getFtpServer(): FtpServer | undefined {
	return db.select().from(ftpServer).where(eq(ftpServer.id, ROW_ID)).get();
}

export function saveFtpServer(config: FtpConfig, now = Date.now()) {
	// Changing the settings invalidates the previous connection test.
	const row = {
		...config,
		id: ROW_ID,
		updatedAt: now,
		lastTestedAt: null,
		lastTestOk: null,
		lastTestMessage: null
	};
	db.insert(ftpServer).values(row).onConflictDoUpdate({ target: ftpServer.id, set: row }).run();
}

export function recordFtpTest(ok: boolean, message: string, now = Date.now()) {
	db.update(ftpServer)
		.set({ lastTestedAt: now, lastTestOk: ok, lastTestMessage: message })
		.where(eq(ftpServer.id, ROW_ID))
		.run();
}

export function deleteFtpServer() {
	db.delete(ftpServer).where(eq(ftpServer.id, ROW_ID)).run();
}
