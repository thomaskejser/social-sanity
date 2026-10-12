import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Path to the SQLite database file.' },
	TOKEN_ENC_KEY: {
		description: 'Base64-encoded 32-byte key used to encrypt OAuth tokens and app secrets at rest.',
		schema: (value) => {
			const key = Buffer.from(value ?? '', 'base64');
			if (key.length !== 32) throw new Error('TOKEN_ENC_KEY must be 32 bytes, base64-encoded');
			return key;
		}
	},
	PUBLIC_BASE_URL: {
		description:
			'Public origin of this app (e.g. https://social.example.com). Used for OAuth redirect URIs and media URLs. Defaults to the request origin.',
		schema: (value) => (value ? value.replace(/\/$/, '') : undefined)
	},
	REPO_DIR: {
		description: 'Where the app keeps its clone of the posts repository. Defaults to data/repo.',
		schema: (value) => value || 'data/repo'
	}
});
