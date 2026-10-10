import { describe, expect, it } from 'vitest';
import { integrationStatus } from './status';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('integrationStatus', () => {
	it('reports unconfigured integrations', () => {
		expect(integrationStatus(false, null, NOW)).toEqual({
			tone: 'neutral',
			label: 'Not configured'
		});
	});

	it('reports configured but unconnected integrations', () => {
		expect(integrationStatus(true, null, NOW).label).toBe('Not connected');
	});

	it('is connected when expiry is far away or unknown', () => {
		expect(integrationStatus(true, { expiresAt: NOW + 40 * DAY }, NOW).tone).toBe('success');
		expect(integrationStatus(true, { expiresAt: null }, NOW).tone).toBe('success');
	});

	it('warns within 7 days of expiry', () => {
		expect(integrationStatus(true, { expiresAt: NOW + 3 * DAY }, NOW)).toEqual({
			tone: 'warning',
			label: 'Expires in 3 days'
		});
		expect(integrationStatus(true, { expiresAt: NOW + 1000 }, NOW).label).toBe('Expires in 1 day');
	});

	it('flags expired tokens', () => {
		expect(integrationStatus(true, { expiresAt: NOW - 1 }, NOW).tone).toBe('danger');
	});
});
