import type { MediaKind } from '#lib/format/types.ts';

export class PublishError extends Error {}

export type PublishMedia = {
	kind: MediaKind;
	mimeType: string;
	size: number;
	read(): Promise<Buffer>;
	/** A URL the platform can fetch the file from; only resolved for platforms that need one. */
	publicUrl(): Promise<string>;
};

export type PublishRequest = {
	accessToken: string;
	/** The platform's id for the connected account (LinkedIn member id, Instagram user id). */
	accountId: string;
	text: string;
	media: PublishMedia[];
};

export type PublishResult = { remoteId: string; remoteUrl: string | null };

export type PublishOptions = {
	fetch?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
	pollIntervalMs?: number;
	timeoutMs?: number;
};

export const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
