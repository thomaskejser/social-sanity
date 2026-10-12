import type { OAuthClientConfig } from './types.ts';

/** Validates the app credentials form. Both values are opaque strings issued by the platform. */
export function parseOAuthClientForm(form: FormData):
	| { ok: true; config: OAuthClientConfig }
	| {
			ok: false;
			values: { clientId: string };
			errors: { clientId?: string; clientSecret?: string };
	  } {
	const clientId = String(form.get('clientId') ?? '').trim();
	const clientSecret = String(form.get('clientSecret') ?? '').trim();
	const errors: { clientId?: string; clientSecret?: string } = {};
	const opaque = /^[\w.\-~+/=]{4,256}$/;
	if (!clientId) errors.clientId = 'Paste the client ID from the developer console.';
	else if (!opaque.test(clientId)) errors.clientId = "That doesn't look like a client ID.";
	if (!clientSecret) errors.clientSecret = 'Paste the client secret from the developer console.';
	else if (!opaque.test(clientSecret))
		errors.clientSecret = "That doesn't look like a client secret.";
	if (errors.clientId || errors.clientSecret) return { ok: false, values: { clientId }, errors };
	return { ok: true, config: { clientId, clientSecret } };
}
