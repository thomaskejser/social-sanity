import { describe, expect, it } from 'vitest';
import {
	displayName,
	formatDay,
	normalizePhone,
	parseDay,
	parseDetail,
	withCallingCode
} from './details.ts';

describe('parseDay', () => {
	it('accepts full and year-less days', () => {
		expect(parseDay('1980-02-29')).toBe('1980-02-29');
		expect(parseDay('--02-29')).toBe('--02-29');
	});

	it('rejects impossible and malformed days', () => {
		expect(parseDay('1981-02-29')).toBeUndefined();
		expect(parseDay('--13-01')).toBeUndefined();
		expect(parseDay('12/03/1980')).toBeUndefined();
		expect(parseDay('')).toBeUndefined();
	});
});

describe('formatDay', () => {
	it('drops an unknown year', () => {
		expect(formatDay(3, 7)).toBe('--03-07');
		expect(formatDay(3, 7, 0)).toBe('--03-07');
		expect(formatDay(3, 7, 1990)).toBe('1990-03-07');
	});

	it('rejects impossible days', () => {
		expect(formatDay(4, 31, 1990)).toBeUndefined();
	});
});

describe('parseDetail', () => {
	it('stores phone numbers in E.164', () => {
		expect(parseDetail('phone', ' mobile ', '+45 12 34-56 78')).toEqual({
			ok: true,
			type: 'mobile',
			value: '+4512345678'
		});
		expect(normalizePhone('0045 1234 5678')).toBe('+4512345678');
	});

	it('rejects phone numbers without a country code', () => {
		expect(parseDetail('phone', '', '12 34 56 78').ok).toBe(false);
	});

	it('rejects empty values', () => {
		expect(parseDetail('nickname', '', '  ').ok).toBe(false);
	});

	it('validates special days', () => {
		expect(parseDetail('specialDay', 'anniversary', '--06-12')).toEqual({
			ok: true,
			type: 'anniversary',
			value: '--06-12'
		});
		expect(parseDetail('specialDay', 'anniversary', 'June 12').ok).toBe(false);
	});
});

describe('displayName', () => {
	it('joins the names that are present', () => {
		expect(displayName('Ada', ['King'], 'Lovelace')).toBe('Ada King Lovelace');
		expect(displayName('Cher', [], '')).toBe('Cher');
	});
});

describe('withCallingCode', () => {
	it('puts the calling code in front of a national number', () => {
		expect(withCallingCode('12 34 56 78', '45')).toBe('+4512345678');
		expect(withCallingCode('(212) 555-0100', '+1')).toBe('+12125550100');
	});

	it('drops a trunk 0, except where the country keeps it', () => {
		expect(withCallingCode('020 7946 0018', '44')).toBe('+442079460018');
		expect(withCallingCode('06 1234 5678', '39')).toBe('+390612345678');
	});

	it('rejects numbers that already have a country code', () => {
		expect(withCallingCode('+45 12 34 56 78', '45')).toBeUndefined();
		expect(withCallingCode('0045 12 34 56 78', '45')).toBeUndefined();
	});

	it('rejects malformed codes and numbers', () => {
		expect(withCallingCode('12 34 56 78', '')).toBeUndefined();
		expect(withCallingCode('12 34 56 78', '0')).toBeUndefined();
		expect(withCallingCode('12 34 56 78', '4567')).toBeUndefined();
		expect(withCallingCode('12 34 56 78', 'DK')).toBeUndefined();
		expect(withCallingCode('12 34 ext 5', '45')).toBeUndefined();
		expect(withCallingCode('123', '45')).toBeUndefined();
		expect(withCallingCode('', '45')).toBeUndefined();
	});
});
