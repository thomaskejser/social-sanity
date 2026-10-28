import { fail } from '@sveltejs/kit';
import { parseFtpForm } from '#lib/server/ftp/config.ts';
import {
	deleteFtpServer,
	getFtpServer,
	recordFtpTest,
	saveFtpServer
} from '#lib/server/ftp/store.ts';
import { testFileServer } from '#lib/server/ftp/transfer.ts';
import { ftpView } from '#lib/server/integrations/views.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ ftp: ftpView() });

export const actions: Actions = {
	saveFtp: async ({ request }) => {
		const result = parseFtpForm(await request.formData());
		if (!result.ok) return fail(400, { ftp: { values: result.values, errors: result.errors } });
		saveFtpServer(result.config);
		return { ftpSaved: true };
	},

	testFtp: async () => {
		const server = getFtpServer();
		if (!server) return fail(400, { error: 'Save the file server settings first.' });
		try {
			const { message, hostKeyFingerprint } = await testFileServer(server);
			recordFtpTest(true, message, hostKeyFingerprint);
			return { ftpTest: { ok: true, message } };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			recordFtpTest(false, message);
			return fail(502, { ftpTest: { ok: false, message } });
		}
	},

	removeFtp: async () => {
		deleteFtpServer();
		return { ftpRemoved: true };
	}
};
