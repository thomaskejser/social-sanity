export type DetailKind = 'nickname' | 'address' | 'phone' | 'specialDay';

export const DETAIL_KINDS: DetailKind[] = ['nickname', 'phone', 'address', 'specialDay'];

export function isDetailKind(value: unknown): value is DetailKind {
	return DETAIL_KINDS.includes(value as DetailKind);
}

export type Detail = { detailId: number; type: string; value: string; mapUrl?: string };

export type ParsedDetail = { ok: true; type: string; value: string } | { ok: false; error: string };

const E164 = /^\+[1-9][0-9]{6,14}$/;
const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEARLESS_DATE = /^--(\d{2})-(\d{2})$/;

/** Removes spaces, dashes, dots and brackets; a leading `00` becomes `+`. */
export function normalizePhone(value: string): string {
	const compact = value.replace(/[\s\-.()]/g, '');
	return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}

export function isE164(value: string): boolean {
	return E164.test(value);
}

/** Italy, San Marino and the Vatican keep the leading 0 of a national number after the code. */
const KEEPS_TRUNK_ZERO = new Set(['39', '378', '379']);

/**
 * A national number written without a country code, given the country calling code (`45` or
 * `+45`). One leading trunk `0` is dropped where the country does so. Returns undefined when the
 * number already has a country code, holds anything but digits and separators, or does not make a
 * valid E.164 number.
 */
export function withCallingCode(national: string, callingCode: string): string | undefined {
	const code = callingCode.trim().replace(/^\+/, '');
	if (!/^[1-9][0-9]{0,2}$/.test(code)) return undefined;
	const digits = normalizePhone(national.trim());
	if (!/^[0-9]+$/.test(digits)) return undefined;
	const subscriber =
		digits.startsWith('0') && !KEEPS_TRUNK_ZERO.has(code) ? digits.slice(1) : digits;
	const value = `+${code}${subscriber}`;
	return isE164(value) ? value : undefined;
}

/**
 * A day is `YYYY-MM-DD`, or `--MM-DD` when the year is unknown (ISO 8601's year-less form).
 * Returns undefined for anything else, including impossible dates.
 */
export function parseDay(value: string): string | undefined {
	const trimmed = value.trim();
	const full = FULL_DATE.exec(trimmed);
	if (full)
		return validDay(Number(full[2]), Number(full[3]), Number(full[1])) ? trimmed : undefined;
	const yearless = YEARLESS_DATE.exec(trimmed);
	if (yearless) return validDay(Number(yearless[1]), Number(yearless[2])) ? trimmed : undefined;
	return undefined;
}

/** Builds a day from parts; year 0 or undefined means the year is unknown. */
export function formatDay(month: number, day: number, year?: number): string | undefined {
	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return parseDay(year ? `${String(year).padStart(4, '0')}-${mm}-${dd}` : `--${mm}-${dd}`);
}

function validDay(month: number, day: number, year = 2000): boolean {
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function describeDay(value: string): string {
	const full = FULL_DATE.exec(value);
	const yearless = YEARLESS_DATE.exec(value);
	if (!full && !yearless) return value;
	const [year, month, day] = full
		? [Number(full[1]), Number(full[2]), Number(full[3])]
		: [2000, Number(yearless![1]), Number(yearless![2])];
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.toLocaleDateString(undefined, {
		timeZone: 'UTC',
		day: 'numeric',
		month: 'long',
		...(full ? { year: 'numeric' } : {})
	});
}

export function mapUrl(address: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function parseDetail(kind: DetailKind, type: string, value: string): ParsedDetail {
	const cleanType = type.trim();
	const cleanValue = value.trim();
	if (!cleanValue) return { ok: false, error: 'Enter a value.' };
	switch (kind) {
		case 'nickname':
			return { ok: true, type: '', value: cleanValue };
		case 'address':
			return { ok: true, type: cleanType, value: cleanValue };
		case 'phone': {
			const phone = normalizePhone(cleanValue);
			if (!isE164(phone))
				return {
					ok: false,
					error: 'Write the number with its country code, e.g. +45 12 34 56 78.'
				};
			return { ok: true, type: cleanType, value: phone };
		}
		case 'specialDay': {
			const day = parseDay(cleanValue);
			if (!day) return { ok: false, error: 'Use YYYY-MM-DD, or --MM-DD when the year is unknown.' };
			return { ok: true, type: cleanType, value: day };
		}
	}
}

export function displayName(firstName: string, middleNames: string[], familyName: string): string {
	return [firstName, ...middleNames, familyName].filter(Boolean).join(' ');
}
