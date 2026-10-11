import { describe, expect, it, vi } from 'vitest';
import { publishInstagram } from './instagram.ts';
import type { PublishMedia } from './types.ts';

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const media = (kind: 'image' | 'video', url: string): PublishMedia => ({
	kind,
	mimeType: kind === 'image' ? 'image/jpeg' : 'video/mp4',
	size: 1,
	read: async () => Buffer.from('x'),
	publicUrl: async () => url
});

const request = (items: PublishMedia[]) => ({
	accessToken: 'tok',
	accountId: '17841',
	text: 'Caption #tag',
	media: items
});

function fakeGraph(statusSequence: string[] = ['FINISHED']) {
	let next = 100;
	const created: Record<string, string>[] = [];
	const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		const path = new URL(url).pathname;
		if (init?.method === 'POST' && path === '/17841/media') {
			created.push(Object.fromEntries(new URLSearchParams(init.body as string)));
			return json({ id: String(next++) });
		}
		if (init?.method === 'POST' && path === '/17841/media_publish') return json({ id: '999' });
		if (url.includes('fields=status_code')) {
			return json({
				status_code: statusSequence.length > 1 ? statusSequence.shift() : statusSequence[0]
			});
		}
		if (url.includes('fields=permalink')) return json({ permalink: 'https://instagram.com/p/abc' });
		return json({ error: { message: `unexpected ${url}` } }, 400);
	});
	return { fetch, created };
}

describe('publishInstagram', () => {
	it('publishes a single image with its caption', async () => {
		const { fetch, created } = fakeGraph();
		const result = await publishInstagram(request([media('image', 'https://m/a.jpg')]), { fetch });

		expect(created).toEqual([
			{ image_url: 'https://m/a.jpg', caption: 'Caption #tag', access_token: 'tok' }
		]);
		expect(result).toEqual({ remoteId: '999', remoteUrl: 'https://instagram.com/p/abc' });
	});

	it('publishes a single video as a reel after it finishes processing', async () => {
		const { fetch, created } = fakeGraph(['IN_PROGRESS', 'IN_PROGRESS', 'FINISHED']);
		const sleep = vi.fn(async () => {});
		await publishInstagram(request([media('video', 'https://m/v.mp4')]), { fetch, sleep });

		expect(created[0]).toMatchObject({ media_type: 'REELS', video_url: 'https://m/v.mp4' });
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it('builds a carousel from child containers', async () => {
		const { fetch, created } = fakeGraph();
		await publishInstagram(
			request([media('image', 'https://m/a.jpg'), media('video', 'https://m/v.mp4')]),
			{ fetch }
		);

		expect(created).toEqual([
			{ image_url: 'https://m/a.jpg', is_carousel_item: 'true', access_token: 'tok' },
			{
				media_type: 'VIDEO',
				video_url: 'https://m/v.mp4',
				is_carousel_item: 'true',
				access_token: 'tok'
			},
			{ media_type: 'CAROUSEL', children: '100,101', caption: 'Caption #tag', access_token: 'tok' }
		]);
	});

	it('fails when Instagram cannot process the media', async () => {
		const { fetch } = fakeGraph(['ERROR']);
		await expect(
			publishInstagram(request([media('image', 'https://m/a.jpg')]), { fetch })
		).rejects.toThrow(/could not process the media/);
	});
});
