import { describe, expect, it } from 'vitest';
import { explainFtpError } from './client';

const config = { host: 'ftp.example.com', port: 21, encryption: 'explicit' as const };

describe('explainFtpError', () => {
	it('explains common failures', () => {
		expect(explainFtpError('getaddrinfo ENOTFOUND ftp.example.com', config)).toMatch(
			/could not be resolved/
		);
		expect(explainFtpError('connect ECONNREFUSED 1.2.3.4:21', config)).toMatch(
			/ftp.example.com:21/
		);
		expect(explainFtpError('530 Login incorrect.', config)).toMatch(/username or password/);
		expect(explainFtpError('502 Command not supported', config)).toMatch(/FTPS/);
		expect(explainFtpError('self-signed certificate', config)).toMatch(/TLS handshake/);
	});

	it('only suggests FTPS problems when FTPS is in use', () => {
		expect(explainFtpError('502 Command not supported', { ...config, encryption: 'none' })).toBe(
			'502 Command not supported'
		);
	});
});
