import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	SOCIAL_SANITY_DATABASE_URL: { description: 'Path to the SQLite database file.' },
	SOCIAL_SANITY_TOKEN_ENC_KEY: {
		description: 'Base64-encoded 32-byte key used to encrypt OAuth tokens and app secrets at rest.',
		schema: (value) => {
			const key = Buffer.from(value ?? '', 'base64');
			if (key.length !== 32)
				throw new Error('SOCIAL_SANITY_TOKEN_ENC_KEY must be 32 bytes, base64-encoded');
			return key;
		}
	},
	SOCIAL_SANITY_PUBLIC_BASE_URL: {
		description:
			'Public origin of this app (e.g. https://social.example.com). Used for OAuth redirect URIs and media URLs. Defaults to the request origin.',
		schema: (value) => (value ? value.replace(/\/$/, '') : undefined)
	},
	SOCIAL_SANITY_BACKUP_TOKEN: {
		description:
			'Bearer token backup agents send to GET /api/backup. The endpoint is off while this is unset.',
		schema: (value) => {
			if (value && value.length < 32)
				throw new Error('SOCIAL_SANITY_BACKUP_TOKEN must be at least 32 characters');
			return value || undefined;
		}
	},
	SOCIAL_SANITY_REPO_DIR: {
		description: 'Where the app keeps its clone of the posts repository. Defaults to data/repo.',
		schema: (value) => value || 'data/repo'
	}
});
