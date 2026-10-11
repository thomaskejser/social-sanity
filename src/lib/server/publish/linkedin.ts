import { readJson } from '../integrations/types.ts';
import {
	defaultSleep,
	PublishError,
	type PublishMedia,
	type PublishOptions,
	type PublishRequest,
	type PublishResult
} from './types.ts';

const API_URL = 'https://api.linkedin.com/rest';
/** LinkedIn's versioned API (YYYYMM). Versions are retired after about a year. */
export const LINKEDIN_VERSION = '202608';

const RESERVED = /[\\|{}@[\]()<>#*_~]/g;
const HASHTAG = /(^|[^\p{L}\p{N}_&/])#([\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*)/gu;

/** Converts plain text to LinkedIn's "little text" commentary: hashtags become hashtag
 * templates and every other reserved character is escaped so it shows literally. */
export function toLittleText(text: string): string {
	const escape = (value: string) => value.replace(RESERVED, '\\$&');
	let result = '';
	let last = 0;
	for (const match of text.matchAll(HASHTAG)) {
		const start = match.index + match[1].length;
		result += escape(text.slice(last, start)) + `{hashtag|\\#|${escape(match[2])}}`;
		last = match.index + match[0].length;
	}
	return result + escape(text.slice(last));
}

export async function publishLinkedIn(
	request: PublishRequest,
	options: PublishOptions = {}
): Promise<PublishResult> {
	const fetchFn = options.fetch ?? fetch;
	const author = `urn:li:person:${request.accountId}`;
	const headers = {
		Authorization: `Bearer ${request.accessToken}`,
		'LinkedIn-Version': LINKEDIN_VERSION,
		'X-Restli-Protocol-Version': '2.0.0',
		'Content-Type': 'application/json'
	};

	async function post(path: string, body: unknown, what: string) {
		const response = await fetchFn(`${API_URL}${path}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});
		return { response, body: await readJson(response, what) };
	}

	async function upload(url: string, bytes: Buffer, what: string): Promise<Response> {
		const response = await fetchFn(url, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${request.accessToken}`,
				'Content-Type': 'application/octet-stream'
			},
			body: new Uint8Array(bytes)
		});
		if (!response.ok) {
			throw new PublishError(`${what} failed (${response.status}): ${await response.text()}`);
		}
		return response;
	}

	async function uploadImage(item: PublishMedia): Promise<string> {
		const { body } = await post(
			'/images?action=initializeUpload',
			{ initializeUploadRequest: { owner: author } },
			'LinkedIn image upload'
		);
		const value = body.value as { uploadUrl: string; image: string };
		await upload(value.uploadUrl, await item.read(), 'LinkedIn image upload');
		return value.image;
	}

	async function uploadVideo(item: PublishMedia): Promise<string> {
		const { body } = await post(
			'/videos?action=initializeUpload',
			{
				initializeUploadRequest: {
					owner: author,
					fileSizeBytes: item.size,
					uploadCaptions: false,
					uploadThumbnail: false
				}
			},
			'LinkedIn video upload'
		);
		const value = body.value as {
			video: string;
			uploadToken: string;
			uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[];
		};
		const bytes = await item.read();
		const partIds: string[] = [];
		for (const part of value.uploadInstructions) {
			const response = await upload(
				part.uploadUrl,
				bytes.subarray(part.firstByte, part.lastByte + 1),
				'LinkedIn video upload'
			);
			partIds.push(response.headers.get('etag') ?? '');
		}
		await post(
			'/videos?action=finalizeUpload',
			{
				finalizeUploadRequest: {
					video: value.video,
					uploadToken: value.uploadToken ?? '',
					uploadedPartIds: partIds
				}
			},
			'LinkedIn video finalize'
		);
		await waitForVideo(value.video);
		return value.video;
	}

	async function waitForVideo(urn: string) {
		const sleep = options.sleep ?? defaultSleep;
		const interval = options.pollIntervalMs ?? 3000;
		const deadline = Date.now() + (options.timeoutMs ?? 10 * 60 * 1000);
		while (Date.now() <= deadline) {
			const response = await fetchFn(`${API_URL}/videos/${encodeURIComponent(urn)}`, { headers });
			const body = await readJson(response, 'LinkedIn video status');
			if (body.status === 'AVAILABLE') return;
			if (body.status === 'PROCESSING_FAILED') {
				throw new PublishError(
					`LinkedIn could not process the video: ${String(body.processingFailureReason ?? 'unknown reason')}`
				);
			}
			await sleep(interval);
		}
		throw new PublishError('LinkedIn took too long to process the video.');
	}

	const images = request.media.filter((m) => m.kind === 'image');
	const videos = request.media.filter((m) => m.kind === 'video');
	if (images.length > 0 && videos.length > 0) {
		throw new PublishError('LinkedIn posts can have images or one video, not both.');
	}

	let content: Record<string, unknown> | undefined;
	if (videos.length === 1) {
		content = { media: { id: await uploadVideo(videos[0]) } };
	} else if (videos.length > 1) {
		throw new PublishError('LinkedIn posts can have only one video.');
	} else if (images.length === 1) {
		content = { media: { id: await uploadImage(images[0]) } };
	} else if (images.length > 1) {
		const ids = [];
		for (const image of images) ids.push(await uploadImage(image));
		content = { multiImage: { images: ids.map((id) => ({ id })) } };
	}

	const { response } = await post(
		'/posts',
		{
			author,
			commentary: toLittleText(request.text),
			visibility: 'PUBLIC',
			distribution: {
				feedDistribution: 'MAIN_FEED',
				targetEntities: [],
				thirdPartyDistributionChannels: []
			},
			...(content ? { content } : {}),
			lifecycleState: 'PUBLISHED',
			isReshareDisabledByAuthor: false
		},
		'LinkedIn post'
	);
	const remoteId = response.headers.get('x-restli-id');
	if (!remoteId) throw new PublishError('LinkedIn accepted the post but returned no post id.');
	return { remoteId, remoteUrl: `https://www.linkedin.com/feed/update/${remoteId}/` };
}
