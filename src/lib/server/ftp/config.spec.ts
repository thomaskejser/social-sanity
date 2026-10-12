import { describe, expect, it } from 'vitest';
import { parseFtpForm, readPassword, validateEnvVarName } from './config';

function form(fields: Record<string, string>) {
	const data = new FormData();
	for (const [k, v] of Object.entries(fields)) data.set(k, v);
	return data;
}

const valid = {
	protocol: 'ftp',
	host: 'ftp.example.com',
	port: '',
	username: 'uploader',
	passwordEnvVar: 'FTP_PASSWORD',
	encryption: 'explicit',
	remoteDir: '',
	publicUrl: 'https://media.example.com/uploads/'
};

describe('parseFtpForm', () => {
	it('accepts a valid form and applies defaults', () => {
		expect(parseFtpForm(form(valid))).toEqual({
			ok: true,
			config: {
				protocol: 'ftp',
				host: 'ftp.example.com',
				port: 21,
				username: 'uploader',
				passwordEnvVar: 'FTP_PASSWORD',
				encryption: 'explicit',
				remoteDir: '/',
				publicUrl: 'https://media.example.com/uploads'
			}
		});
	});

	it('defaults implicit FTPS to port 990', () => {
		const result = parseFtpForm(form({ ...valid, encryption: 'implicit' }));
		expect(result.ok && result.config.port).toBe(990);
	});

	it('defaults SFTP to port 22 and ignores the FTP encryption setting', () => {
		const result = parseFtpForm(form({ ...valid, protocol: 'sftp', encryption: '' }));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.config.protocol).toBe('sftp');
		expect(result.config.port).toBe(22);
	});

	it('treats a missing protocol as FTP and rejects unknown ones', () => {
		const { protocol: _omitted, ...withoutProtocol } = valid;
		void _omitted;
		const result = parseFtpForm(form(withoutProtocol));
		expect(result.ok && result.config.protocol).toBe('ftp');
		const bad = parseFtpForm(form({ ...valid, protocol: 'scp' }));
		expect(!bad.ok && bad.errors.protocol).toBeTruthy();
	});

	it('accepts IP addresses', () => {
		expect(parseFtpForm(form({ ...valid, host: '192.168.1.20' })).ok).toBe(true);
		expect(parseFtpForm(form({ ...valid, host: '[2001:db8::1]' })).ok).toBe(true);
	});

	it('reports field errors and echoes values back', () => {
		const result = parseFtpForm(
			form({ ...valid, host: 'ftp://x.com', port: '70000', username: '', publicUrl: 'nope' })
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(Object.keys(result.errors).sort()).toEqual(['host', 'port', 'publicUrl', 'username']);
		expect(result.values.host).toBe('ftp://x.com');
	});

	it('rejects unknown encryption modes', () => {
		const result = parseFtpForm(form({ ...valid, encryption: 'sftp' }));
		expect(!result.ok && result.errors.encryption).toBeTruthy();
	});
});

describe('validateEnvVarName', () => {
	it('accepts conventional names', () => {
		expect(validateEnvVarName('FTP_PASSWORD')).toBeUndefined();
		expect(validateEnvVarName('NAS_FTP_PW2')).toBeUndefined();
	});

	it('rejects malformed names', () => {
		expect(validateEnvVarName('')).toBeDefined();
		expect(validateEnvVarName('ftp_password')).toBeDefined();
		expect(validateEnvVarName('2FTP')).toBeDefined();
		expect(validateEnvVarName('FTP-PASSWORD')).toBeDefined();
	});

	it("refuses the app's own secrets", () => {
		for (const name of ['TOKEN_ENC_KEY', 'PUBLIC_BASE_URL', 'ANTHROPIC_API_KEY']) {
			expect(validateEnvVarName(name)).toMatch(/used by Social Sanity/);
		}
	});
});

describe('readPassword', () => {
	it('reads the named variable', () => {
		expect(readPassword('FTP_PASSWORD', { FTP_PASSWORD: 's3cret' })).toBe('s3cret');
	});

	it('treats missing or empty as unset', () => {
		expect(readPassword('FTP_PASSWORD', {})).toBeUndefined();
		expect(readPassword('FTP_PASSWORD', { FTP_PASSWORD: '' })).toBeUndefined();
	});

	it('never reads reserved variables', () => {
		expect(readPassword('TOKEN_ENC_KEY', { TOKEN_ENC_KEY: 'x'.repeat(44) })).toBeUndefined();
	});
});
