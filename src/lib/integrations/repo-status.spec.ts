import { describe, expect, it } from 'vitest';
import { repoStatus } from './repo-status.ts';

describe('repoStatus', () => {
	it('reports configuration, token and sync state', () => {
		expect(repoStatus(null).label).toBe('Not configured');
		expect(repoStatus({ tokenSet: false, lastSyncOk: true }).label).toBe('Token variable not set');
		expect(repoStatus({ tokenSet: true, lastSyncOk: null }).label).toBe('Not pulled yet');
		expect(repoStatus({ tokenSet: true, lastSyncOk: true }).tone).toBe('ok');
		expect(repoStatus({ tokenSet: true, lastSyncOk: false }).tone).toBe('danger');
	});
});
