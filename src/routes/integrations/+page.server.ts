import { fail } from '@sveltejs/kit';
import { testFileServer } from '#lib/server/ftp/transfer.ts';
import { parseFtpForm, readPassword } from '#lib/server/ftp/config.ts';
import {
	deleteFtpServer,
	getFtpServer,
	recordFtpTest,
	saveFtpServer
} from '#lib/server/ftp/store.ts';
import { deleteAccount, listAccounts } from '#lib/server/integrations/accounts.ts';
import { redirectUriFor } from '#lib/server/integrations/redirect-uri.ts';
import { getIntegration, listIntegrations } from '#lib/server/integrations/registry.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const accounts = listAccounts();
	const connectedId = url.searchParams.get('connected');
	const ftp = getFtpServer();

	return {
		error: url.searchParams.get('error'),
		connected: connectedId ? (getIntegration(connectedId)?.integration.name ?? null) : null,
		integrations: listIntegrations().map(({ integration, configured }) => {
			const account = accounts.find((a) => a.platform === integration.id);
			return {
				id: integration.id,
				name: integration.name,
				note: integration.note ?? null,
				consoleUrl: integration.consoleUrl,
				requiredEnv: integration.requiredEnv,
				redirectUri: redirectUriFor(integration.id, url.origin),
				autoRefresh: !!integration.refresh,
				configured,
				// Never send tokens to the browser — only metadata.
				account: account
					? {
							displayName: account.displayName,
							expiresAt: account.expiresAt,
							connectedAt: account.connectedAt,
							scopes: account.scopes.split(' ').filter(Boolean)
						}
					: null
			};
		}),
		ftp: ftp
			? {
					protocol: ftp.protocol,
					host: ftp.host,
					port: ftp.port,
					username: ftp.username,
					passwordEnvVar: ftp.passwordEnvVar,
					encryption: ftp.encryption,
					remoteDir: ftp.remoteDir,
					publicUrl: ftp.publicUrl,
					hostKeyFingerprint: ftp.hostKeyFingerprint,
					// Only whether the variable is set — never its value.
					passwordSet: readPassword(ftp.passwordEnvVar) !== undefined,
					lastTestedAt: ftp.lastTestedAt,
					lastTestOk: ftp.lastTestOk,
					lastTestMessage: ftp.lastTestMessage
				}
			: null
	};
};

export const actions: Actions = {
	disconnect: async ({ request }) => {
		const platform = (await request.formData()).get('platform');
		if (typeof platform !== 'string' || !getIntegration(platform)) {
			return fail(400, { error: 'Unknown integration.' });
		}
		deleteAccount(platform);
		return { disconnected: getIntegration(platform)!.integration.name };
	},

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
