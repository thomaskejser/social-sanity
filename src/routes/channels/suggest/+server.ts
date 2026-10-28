import { json } from '@sveltejs/kit';
import { listChannels } from '#lib/server/channels/store.ts';
import type { RequestHandler } from './$types';

const LIMIT = 10;

/** Distinct channel names matching `?q=`, names starting with it first. */
export const GET: RequestHandler = ({ url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	if (!search) return json([]);
	return json([...new Set(listChannels(search, LIMIT, 0).map((c) => c.channel))]);
};
