import { readJson } from '../integrations/types.ts';
import {
	defaultSleep,
	PublishError,
	type PublishMedia,
	type PublishOptions,
	type PublishRequest,
	type PublishResult
} from './types.ts';

const GRAPH_URL = 'https://graph.instagram.com';

/** Publishes via media containers: one per item (plus a carousel parent), wait until
 * Instagram has fetched and processed them, then publish. */
export async function publishInstagram(
	request: PublishRequest,
	options: PublishOptions = {}
): Promise<PublishResult> {
	const fetchFn = options.fetch ?? fetch;
	const sleep = options.sleep ?? defaultSleep;
	const interval = options.pollIntervalMs ?? 3000;
	const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;

	async function call(path: string, params: Record<string, string>, what: string) {
		const response = await fetchFn(`${GRAPH_URL}${path}`, {
			method: 'POST',
			body: new URLSearchParams({ ...params, access_token: request.accessToken })
		});
		return readJson(response, what);
	}

	async function get(path: string, fields: string, what: string) {
		const query = new URLSearchParams({ fields, access_token: request.accessToken });
		return readJson(await fetchFn(`${GRAPH_URL}${path}?${query}`), what);
	}

	async function createContainer(params: Record<string, string>): Promise<string> {
		const body = await call(`/${request.accountId}/media`, params, 'Instagram media upload');
		return String(body.id);
	}

	async function waitUntilFinished(containerId: string) {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() <= deadline) {
			const body = await get(`/${containerId}`, 'status_code,status', 'Instagram media status');
			if (body.status_code === 'FINISHED') return;
			if (body.status_code === 'ERROR' || body.status_code === 'EXPIRED') {
				throw new PublishError(
					`Instagram could not process the media: ${String(body.status ?? body.status_code)}`
				);
			}
			await sleep(interval);
		}
		throw new PublishError('Instagram took too long to process the media.');
	}

	async function itemParams(
		item: PublishMedia,
		inCarousel: boolean
	): Promise<Record<string, string>> {
		const url = await item.publicUrl();
		if (item.kind === 'image') {
			return { image_url: url, ...(inCarousel ? { is_carousel_item: 'true' } : {}) };
		}
		return inCarousel
			? { media_type: 'VIDEO', video_url: url, is_carousel_item: 'true' }
			: { media_type: 'REELS', video_url: url };
	}

	if (request.media.length === 0) {
		throw new PublishError('Instagram posts need at least one image or video.');
	}

	let containerId: string;
	if (request.media.length === 1) {
		containerId = await createContainer({
			...(await itemParams(request.media[0], false)),
			caption: request.text
		});
	} else {
		const children = [];
		for (const item of request.media) {
			children.push(await createContainer(await itemParams(item, true)));
		}
		for (const child of children) await waitUntilFinished(child);
		containerId = await createContainer({
			media_type: 'CAROUSEL',
			children: children.join(','),
			caption: request.text
		});
	}
	await waitUntilFinished(containerId);

	const published = await call(
		`/${request.accountId}/media_publish`,
		{ creation_id: containerId },
		'Instagram publish'
	);
	const remoteId = String(published.id);
	const details = await get(`/${remoteId}`, 'permalink', 'Instagram permalink').catch(() => ({}));
	const permalink = (details as { permalink?: unknown }).permalink;
	return { remoteId, remoteUrl: typeof permalink === 'string' ? permalink : null };
}
