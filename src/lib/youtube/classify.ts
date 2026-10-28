export const CHANNEL_KINDS = ['HUMAN', 'COMPANY', 'CHANNEL'] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export type ChannelSuggestion = { kind: ChannelKind; name: string; reason: string };

export function isChannelKind(value: unknown): value is ChannelKind {
	return CHANNEL_KINDS.includes(value as ChannelKind);
}

/** The address of a channel on YouTube. */
export function channelUrl(channelId: string): string {
	return `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;
}

/** The channel's Atom feed, which the app reads for Consume. */
export function channelFeedUrl(channelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

/**
 * Reads Claude's `report_classification` tool input. Only the channels that were asked about are
 * kept; an unknown kind or an empty name drops that channel, so it stays unclassified.
 */
export function parseClassification(
	input: unknown,
	askedIds: number[]
): Map<number, ChannelSuggestion> {
	const asked = new Set(askedIds);
	const result = new Map<number, ChannelSuggestion>();
	const channels = (input as { channels?: unknown } | null)?.channels;
	for (const raw of Array.isArray(channels) ? channels : []) {
		const item = (raw ?? {}) as Record<string, unknown>;
		const id = Number(item.id);
		const name = typeof item.name === 'string' ? item.name.trim() : '';
		if (!asked.has(id) || result.has(id) || !isChannelKind(item.kind) || !name) continue;
		result.set(id, {
			kind: item.kind,
			name,
			reason: typeof item.reason === 'string' ? item.reason.trim() : ''
		});
	}
	return result;
}
