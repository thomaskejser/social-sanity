import { describe, expect, it, vi } from 'vitest';
import { LINKEDIN_VERSION, publishLinkedIn, toLittleText } from './linkedin.ts';
import type { PublishMedia } from './types.ts';

const json = (body: unknown, init: ResponseInit = {}) =>
	new Response(JSON.stringify(body), {
		status: 200,
		...init,
		headers: { 'content-type': 'application/json', ...init.headers }
	});

const media = (kind: 'image' | 'video', bytes = 'abcdef'): PublishMedia => ({
	kind,
	mimeType: kind === 'image' ? 'image/jpeg' : 'video/mp4',
	size: bytes.length,
	read: async () => Buffer.from(bytes),
	publicUrl: async () => 'unused'
});

const request = (items: PublishMedia[], text = 'Hello') => ({
	accessToken: 'tok',
	accountId: 'abc123',
	text,
	media: items
});

describe('toLittleText', () => {
	it('escapes reserved characters and templates hashtags', () => {
		expect(toLittleText('Hi (all) @you #svelte_kit, C# *bold*')).toBe(
			'Hi \\(all\\) \\@you {hashtag|\\#|svelte\\_kit}, C\\# \\*bold\\*'
		);
	});
});

describe('publishLinkedIn', () => {
	it('publishes a text-only post with the version headers', async () => {
		const fetch = vi.fn(async () =>
			json({}, { status: 201, headers: { 'x-restli-id': 'urn:li:share:9' } })
		);
		const result = await publishLinkedIn(request([], 'Hi (there)'), { fetch });

		expect(result).toEqual({
			remoteId: 'urn:li:share:9',
			remoteUrl: 'https://www.linkedin.com/feed/update/urn:li:share:9/'
		});
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.linkedin.com/rest/posts');
		expect(init.headers).toMatchObject({
			Authorization: 'Bearer tok',
			'LinkedIn-Version': LINKEDIN_VERSION,
			'X-Restli-Protocol-Version': '2.0.0'
		});
		const body = JSON.parse(init.body as string);
		expect(body).toMatchObject({
			author: 'urn:li:person:abc123',
			commentary: 'Hi \\(there\\)',
			lifecycleState: 'PUBLISHED'
		});
		expect(body.content).toBeUndefined();
	});

	it('uploads several images and posts them as a multi-image post', async () => {
		let n = 0;
		const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.includes('initializeUpload')) {
				n++;
				return json({ value: { uploadUrl: `https://upload/${n}`, image: `urn:li:image:${n}` } });
			}
			if (url.startsWith('https://upload/')) {
				expect(init?.method).toBe('PUT');
				return new Response(null, { status: 201 });
			}
			return json({}, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } });
		});
		await publishLinkedIn(request([media('image'), media('image')]), { fetch });

		const postCall = fetch.mock.calls.find(([url]) => String(url).endsWith('/posts'))!;
		expect(JSON.parse(postCall[1]!.body as string).content).toEqual({
			multiImage: { images: [{ id: 'urn:li:image:1' }, { id: 'urn:li:image:2' }] }
		});
	});

	it('uploads a video in parts, finalizes it and waits until it is available', async () => {
		const statuses = ['PROCESSING', 'AVAILABLE'];
		const puts: string[] = [];
		const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.includes('videos?action=initializeUpload')) {
				return json({
					value: {
						video: 'urn:li:video:7',
						uploadToken: 't',
						uploadInstructions: [
							{ uploadUrl: 'https://up/a', firstByte: 0, lastByte: 2 },
							{ uploadUrl: 'https://up/b', firstByte: 3, lastByte: 5 }
						]
					}
				});
			}
			if (url.startsWith('https://up/')) {
				puts.push(Buffer.from(init!.body as Uint8Array).toString());
				return new Response(null, { status: 200, headers: { etag: `e-${url.at(-1)}` } });
			}
			if (url.includes('finalizeUpload')) {
				expect(JSON.parse(init!.body as string).finalizeUploadRequest.uploadedPartIds).toEqual([
					'e-a',
					'e-b'
				]);
				return json({});
			}
			if (url.includes('/videos/')) return json({ status: statuses.shift() });
			return json({}, { status: 201, headers: { 'x-restli-id': 'urn:li:share:2' } });
		});
		const sleep = vi.fn(async () => {});
		await publishLinkedIn(request([media('video', 'abcdef')]), { fetch, sleep });

		expect(puts).toEqual(['abc', 'def']);
		expect(sleep).toHaveBeenCalledOnce();
		const postCall = fetch.mock.calls.find(([url]) => String(url).endsWith('/posts'))!;
		expect(JSON.parse(postCall[1]!.body as string).content).toEqual({
			media: { id: 'urn:li:video:7' }
		});
	});

	it('reports LinkedIn error messages', async () => {
		const fetch = vi.fn(async () =>
			json({ message: 'Invalid author', status: 422 }, { status: 422 })
		);
		await expect(publishLinkedIn(request([]), { fetch })).rejects.toThrow(
			'LinkedIn post failed (422): Invalid author'
		);
	});
});
