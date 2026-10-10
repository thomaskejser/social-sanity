import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Path to the SQLite database file.' },
	APP_PASSWORD_HASH: {
		description: 'scrypt hash of the login password. Generate with `npm run hash-password`.',
		schema: (value) => {
			if (!value?.startsWith('scrypt:'))
				throw new Error('APP_PASSWORD_HASH must be an scrypt hash');
			return value;
		}
	},
	SESSION_SECRET: {
		description: 'Secret used to sign the session cookie (at least 32 characters).',
		schema: (value) => {
			if (!value || value.length < 32)
				throw new Error('SESSION_SECRET must be at least 32 characters');
			return value;
		}
	},
	TOKEN_ENC_KEY: {
		description: 'Base64-encoded 32-byte key used to encrypt OAuth tokens at rest.',
		schema: (value) => {
			const key = Buffer.from(value ?? '', 'base64');
			if (key.length !== 32) throw new Error('TOKEN_ENC_KEY must be 32 bytes, base64-encoded');
			return key;
		}
	}
});
