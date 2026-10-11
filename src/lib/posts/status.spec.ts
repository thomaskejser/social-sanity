import { describe, expect, it } from 'vitest';
import { statusLabel, targetStatus } from './status.ts';

describe('targetStatus', () => {
	it('reports publishing progress before readiness', () => {
		expect(targetStatus('published', 'x', true).label).toBe('Published');
		expect(targetStatus('publishing', null, false).label).toBe('Publishing…');
		expect(targetStatus('failed', null, false).tone).toBe('danger');
	});

	it('explains why a draft is not ready', () => {
		expect(targetStatus('draft', 'LinkedIn is not connected.', false).label).toBe('Not connected');
		expect(targetStatus('draft', null, true)).toEqual({ tone: 'warn', label: 'Needs changes' });
		expect(targetStatus('draft', null, false)).toEqual({ tone: 'info', label: 'Ready' });
	});

	it('labels drafts in lists without readiness details', () => {
		expect(statusLabel('draft')).toEqual({ tone: 'neutral', label: 'Draft' });
		expect(statusLabel('published').label).toBe('Published');
	});
});
