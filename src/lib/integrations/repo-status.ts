import type { IntegrationStatus } from './status.ts';

export function repoStatus(
	repo: { tokenSet: boolean; lastSyncOk: boolean | null } | null
): IntegrationStatus {
	if (!repo) return { tone: 'neutral', label: 'Not configured' };
	if (!repo.tokenSet) return { tone: 'danger', label: 'Token variable not set' };
	if (repo.lastSyncOk === null) return { tone: 'neutral', label: 'Not pulled yet' };
	return repo.lastSyncOk
		? { tone: 'ok', label: 'In sync' }
		: { tone: 'danger', label: 'Sync failed' };
}
