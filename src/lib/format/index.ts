import { instagram } from './instagram.ts';
import { linkedin } from './linkedin.ts';
import type { DraftMedia, Issue, PlatformFormat, PlatformId } from './types.ts';

export type { DraftMedia, Issue, MediaKind, PlatformFormat, PlatformId } from './types.ts';

export const PLATFORMS: PlatformFormat[] = [linkedin, instagram];

export const PLATFORM_IDS: PlatformId[] = PLATFORMS.map((p) => p.id);

export function platformFormat(id: PlatformId): PlatformFormat {
	const platform = PLATFORMS.find((p) => p.id === id);
	if (!platform) throw new Error(`Unknown platform: ${id}`);
	return platform;
}

export function isPlatformId(value: unknown): value is PlatformId {
	return PLATFORM_IDS.includes(value as PlatformId);
}

export function hasErrors(issues: Issue[]): boolean {
	return issues.some((issue) => issue.level === 'error');
}

export function checkPost(id: PlatformId, text: string, media: DraftMedia[]): Issue[] {
	return platformFormat(id).check(text, media);
}
