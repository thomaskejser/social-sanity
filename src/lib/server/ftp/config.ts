import { variables } from '../../../env.ts';

export type FtpEncryption = 'explicit' | 'implicit' | 'none';

export type FtpConfig = {
	host: string;
	port: number;
	username: string;
	passwordEnvVar: string;
	encryption: FtpEncryption;
	remoteDir: string;
	publicUrl: string | null;
};

export type FtpFormValues = Record<keyof FtpConfig, string>;
export type FtpFormErrors = Partial<Record<keyof FtpConfig, string>>;

export const DEFAULT_PORTS: Record<FtpEncryption, number> = {
	explicit: 21,
	implicit: 990,
	none: 21
};

const ENV_VAR_NAME = /^[A-Z][A-Z0-9_]*$/;
const HOST = /^[A-Za-z0-9.\-:[\]]+$/;

/**
 * The app's own secrets may not be used as the FTP password variable — otherwise saving the form
 * would send e.g. TOKEN_ENC_KEY to whatever server is configured.
 */
const RESERVED_ENV_VARS = new Set([...Object.keys(variables), 'ANTHROPIC_API_KEY']);

export function validateEnvVarName(name: string): string | undefined {
	if (!name) return 'Enter the name of the environment variable that holds the password.';
	if (!ENV_VAR_NAME.test(name))
		return 'Use upper-case letters, digits and underscores, starting with a letter (e.g. FTP_PASSWORD).';
	if (RESERVED_ENV_VARS.has(name))
		return `${name} is used by Social Sanity itself; choose another variable.`;
	return undefined;
}

/** Reads the password from the environment at the moment it is needed; it is never persisted. */
export function readPassword(
	envVar: string,
	env: NodeJS.ProcessEnv = process.env
): string | undefined {
	if (validateEnvVarName(envVar)) return undefined;
	return env[envVar] || undefined;
}

function field(form: FormData, name: keyof FtpConfig): string {
	const value = form.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

export function parseFtpForm(
	form: FormData
): { ok: true; config: FtpConfig } | { ok: false; values: FtpFormValues; errors: FtpFormErrors } {
	const values: FtpFormValues = {
		host: field(form, 'host'),
		port: field(form, 'port'),
		username: field(form, 'username'),
		passwordEnvVar: field(form, 'passwordEnvVar'),
		encryption: field(form, 'encryption'),
		remoteDir: field(form, 'remoteDir'),
		publicUrl: field(form, 'publicUrl')
	};
	const errors: FtpFormErrors = {};

	if (!values.host) errors.host = 'Enter a hostname or IP address.';
	else if (values.host.includes('://')) errors.host = 'Enter just the hostname, without ftp://.';
	else if (!HOST.test(values.host) || values.host.length > 253)
		errors.host = 'Not a valid hostname or IP address.';

	const encryption = (['explicit', 'implicit', 'none'] as const).find(
		(e) => e === values.encryption
	);
	if (!encryption) errors.encryption = 'Choose an encryption mode.';

	const port = values.port ? Number(values.port) : DEFAULT_PORTS[encryption ?? 'explicit'];
	if (!Number.isInteger(port) || port < 1 || port > 65535)
		errors.port = 'Port must be between 1 and 65535.';

	if (!values.username) errors.username = 'Enter the FTP username.';

	const envError = validateEnvVarName(values.passwordEnvVar);
	if (envError) errors.passwordEnvVar = envError;

	const remoteDir = values.remoteDir || '/';
	if (/[\0\r\n]/.test(remoteDir)) errors.remoteDir = 'Directory contains invalid characters.';

	let publicUrl: string | null = null;
	if (values.publicUrl) {
		try {
			const url = new URL(values.publicUrl);
			if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
			publicUrl = url.toString().replace(/\/$/, '');
		} catch {
			errors.publicUrl = 'Enter a full http(s) URL, e.g. https://media.example.com/uploads.';
		}
	}

	if (Object.keys(errors).length > 0 || !encryption) return { ok: false, values, errors };
	return {
		ok: true,
		config: {
			host: values.host,
			port,
			username: values.username,
			passwordEnvVar: values.passwordEnvVar,
			encryption,
			remoteDir,
			publicUrl
		}
	};
}
