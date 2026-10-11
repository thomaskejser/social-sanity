import type { IntegrationStatus } from './status.ts';

export function ftpStatus(
	server: { passwordSet: boolean; lastTestOk: boolean | null } | null
): IntegrationStatus {
	if (!server) return { tone: 'neutral', label: 'Not configured' };
	if (!server.passwordSet) return { tone: 'danger', label: 'Password variable not set' };
	if (server.lastTestOk === null) return { tone: 'neutral', label: 'Not tested' };
	return server.lastTestOk
		? { tone: 'ok', label: 'Connected' }
		: { tone: 'danger', label: 'Connection failed' };
}
