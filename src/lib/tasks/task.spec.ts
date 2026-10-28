import { describe, expect, it } from 'vitest';
import { parseQuadrant, quadrantChoice } from './task.ts';

function form(fields: Record<string, string>): FormData {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) data.set(name, value);
	return data;
}

describe('parseQuadrant', () => {
	it('reads true and false', () => {
		expect(parseQuadrant(form({ urgent: 'true', important: 'false' }))).toEqual({
			urgent: true,
			important: false
		});
		expect(parseQuadrant(form({ urgent: 'false', important: 'true' }))).toEqual({
			urgent: false,
			important: true
		});
	});

	it('rejects missing or other values', () => {
		expect(parseQuadrant(form({ urgent: 'true' }))).toBeNull();
		expect(parseQuadrant(form({ urgent: 'on', important: 'true' }))).toBeNull();
		expect(parseQuadrant(form({}))).toBeNull();
	});
});

describe('quadrantChoice', () => {
	const form = (quadrant?: string) => {
		const data = new FormData();
		if (quadrant !== undefined) data.set('quadrant', quadrant);
		return data;
	};

	it('reads each of the four quadrants', () => {
		expect(quadrantChoice(form('true:true'))?.title).toBe('Urgent and important');
		expect(quadrantChoice(form('false:true'))?.title).toBe('Important, not urgent');
		expect(quadrantChoice(form('true:false'))?.title).toBe('Urgent, not important');
		expect(quadrantChoice(form('false:false'))?.title).toBe('Neither');
	});

	it('rejects a missing or malformed choice', () => {
		expect(quadrantChoice(form())).toBeUndefined();
		expect(quadrantChoice(form('true'))).toBeUndefined();
		expect(quadrantChoice(form('yes:no'))).toBeUndefined();
	});
});
