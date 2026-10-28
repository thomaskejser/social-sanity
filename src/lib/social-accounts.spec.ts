import { describe, expect, it } from 'vitest';
import { accountHandle, parseSocialAccount } from './social-accounts.ts';

describe('parseSocialAccount', () => {
	it('recognises platforms by host, including subdomains', () => {
		expect(parseSocialAccount('https://www.linkedin.com/in/ada')?.platform).toBe('linkedin');
		expect(parseSocialAccount('https://dk.linkedin.com/in/ada')?.platform).toBe('linkedin');
		expect(parseSocialAccount('https://twitter.com/ada')?.platform).toBe('x');
		expect(parseSocialAccount('https://ada.substack.com')?.platform).toBe('substack');
		expect(parseSocialAccount('https://bsky.app/profile/ada.bsky.social')?.platform).toBe(
			'bluesky'
		);
	});

	it('takes /@name on other hosts as Mastodon', () => {
		expect(parseSocialAccount('https://hachyderm.io/@ada')).toEqual({
			platform: 'mastodon',
			url: 'https://hachyderm.io/@ada'
		});
	});

	it('rejects unknown hosts, look-alike hosts and non-web addresses', () => {
		expect(parseSocialAccount('https://ada.example.com/blog')).toBeUndefined();
		expect(parseSocialAccount('https://notlinkedin.com/in/ada')).toBeUndefined();
		expect(parseSocialAccount('javascript:alert(1)')).toBeUndefined();
		expect(parseSocialAccount('linkedin.com/in/ada')).toBeUndefined();
	});
});

describe('accountHandle', () => {
	it('shows the handle, without profile prefixes', () => {
		expect(accountHandle('https://www.linkedin.com/in/ada-lovelace/')).toBe('ada-lovelace');
		expect(accountHandle('https://hachyderm.io/@ada')).toBe('@ada');
		expect(accountHandle('https://ada.substack.com/')).toBe('ada.substack.com');
	});
});
