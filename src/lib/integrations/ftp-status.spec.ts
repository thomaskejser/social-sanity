import { describe, expect, it } from 'vitest';
import { ftpStatus } from './ftp-status';

describe('ftpStatus', () => {
	it('covers each state', () => {
		expect(ftpStatus(null).label).toBe('Not configured');
		expect(ftpStatus({ passwordSet: false, lastTestOk: true }).label).toBe(
			'Password variable not set'
		);
		expect(ftpStatus({ passwordSet: true, lastTestOk: null }).label).toBe('Not tested');
		expect(ftpStatus({ passwordSet: true, lastTestOk: true }).tone).toBe('success');
		expect(ftpStatus({ passwordSet: true, lastTestOk: false }).tone).toBe('danger');
	});
});
