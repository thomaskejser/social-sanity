import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { explainSftpError, fingerprint } from './sftp';

describe('fingerprint', () => {
	it('formats like OpenSSH (SHA256:<base64 without padding>)', () => {
		const key = Buffer.from('fake-host-key');
		const expected = createHash('sha256').update(key).digest('base64').replace(/=+$/, '');
		expect(fingerprint(key)).toBe(`SHA256:${expected}`);
		expect(fingerprint(key)).not.toMatch(/=$/);
	});
});

describe('explainSftpError', () => {
	const config = { host: 'sftp.example.com', port: 22 };

	it('explains common failures', () => {
		expect(explainSftpError('getaddrinfo ENOTFOUND sftp.example.com', config)).toMatch(
			/could not be resolved/
		);
		expect(explainSftpError('connect ECONNREFUSED 1.2.3.4:22', config)).toMatch(/:22/);
		expect(explainSftpError('All configured authentication methods failed', config)).toMatch(
			/username or password/
		);
	});

	it('passes unknown errors through', () => {
		expect(explainSftpError('something else', config)).toBe('something else');
	});
});
