import { describe, expect, it } from 'vitest';
import { createOAuthState, isValidOAuthState } from './oauth-state';

describe('OAuth state', () => {
	const state = createOAuthState('linkedin');

	it('accepts the matching state for the same platform', () => {
		expect(isValidOAuthState('linkedin', state, state)).toBe(true);
	});

	it('rejects a state issued for another platform', () => {
		expect(isValidOAuthState('instagram', state, state)).toBe(false);
	});

	it('rejects mismatched or missing states', () => {
		expect(isValidOAuthState('linkedin', createOAuthState('linkedin'), state)).toBe(false);
		expect(isValidOAuthState('linkedin', null, state)).toBe(false);
		expect(isValidOAuthState('linkedin', state, undefined)).toBe(false);
	});
});
