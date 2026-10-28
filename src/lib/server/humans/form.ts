import { displayName, parseDay } from '#lib/humans/details.ts';
import type { HumanNames } from './store.ts';

export type HumanFormErrors = Partial<Record<'human' | 'firstName' | 'birthday', string>>;

function field(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Reads a human's names. An empty display name is filled from the name parts; once stored it is
 * kept as written.
 */
export function parseHumanForm(
	form: FormData
): { ok: true; names: HumanNames } | { ok: false; errors: HumanFormErrors } {
	const firstName = field(form, 'firstName');
	const middleNames = field(form, 'middleNames').split(/\s+/).filter(Boolean);
	const familyName = field(form, 'familyName');
	const human = field(form, 'human') || displayName(firstName, middleNames, familyName);
	const birthdayInput = field(form, 'birthday');
	const birthday = birthdayInput ? parseDay(birthdayInput) : '';

	const errors: HumanFormErrors = {};
	if (!human) errors.human = 'Enter a display name or a first name.';
	if (birthday === undefined)
		errors.birthday = 'Use YYYY-MM-DD, or --MM-DD when the year is unknown.';
	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		names: { human, firstName, middleNames, familyName, birthday: birthday ?? '' }
	};
}

export function idField(form: FormData, name: string): number | undefined {
	const id = Number(form.get(name));
	return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function kudosField(form: FormData): number | undefined {
	const kudos = Number(form.get('kudos'));
	return Number.isInteger(kudos) && kudos >= 0 && kudos <= 10 ? kudos : undefined;
}
