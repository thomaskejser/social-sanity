import type { CompanyInput } from './store.ts';

export type CompanyFormErrors = Partial<Record<'company' | 'website', string>>;

function field(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/** Reads a company's name, website and notes; the website must be an http(s) address if given. */
export function parseCompanyForm(
	form: FormData
): { ok: true; input: CompanyInput } | { ok: false; errors: CompanyFormErrors } {
	const input = {
		company: field(form, 'company'),
		website: field(form, 'website'),
		notes: field(form, 'notes')
	};
	const errors: CompanyFormErrors = {};
	if (!input.company) errors.company = 'Name the company.';
	if (input.website) {
		try {
			const url = new URL(input.website);
			if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
			input.website = url.toString();
		} catch {
			errors.website = 'Enter a full address, e.g. https://example.com.';
		}
	}
	return Object.keys(errors).length ? { ok: false, errors } : { ok: true, input };
}
