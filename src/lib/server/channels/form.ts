import type { ChannelInput } from './store.ts';

export type ChannelFormErrors = Partial<Record<'channel' | 'website', string>>;

function field(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/** Reads a channel's name, website and notes; the website must be an http(s) address if given. */
export function parseChannelForm(
	form: FormData
): { ok: true; input: ChannelInput } | { ok: false; errors: ChannelFormErrors } {
	const input = {
		channel: field(form, 'channel'),
		website: field(form, 'website'),
		notes: field(form, 'notes')
	};
	const errors: ChannelFormErrors = {};
	if (!input.channel) errors.channel = 'Name the channel.';
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
