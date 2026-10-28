import { describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', () => ({ db: {} }));

const { isBackupAuthorized } = await import('./backup.ts');
const TOKEN = 'a'.repeat(40);

describe('isBackupAuthorized', () => {
	it('accepts the token as a bearer token', () => {
		expect(isBackupAuthorized(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
		expect(isBackupAuthorized(`bearer ${TOKEN}`, TOKEN)).toBe(true);
	});

	it('rejects a missing, wrong or partial token', () => {
		expect(isBackupAuthorized(null, TOKEN)).toBe(false);
		expect(isBackupAuthorized('Bearer nope', TOKEN)).toBe(false);
		expect(isBackupAuthorized(`Bearer ${TOKEN.slice(1)}`, TOKEN)).toBe(false);
		expect(isBackupAuthorized(`Bearer ${TOKEN}x`, TOKEN)).toBe(false);
	});
});
