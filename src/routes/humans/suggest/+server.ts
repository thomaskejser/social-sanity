import { json } from '@sveltejs/kit';
import { listHumans } from '#lib/server/humans/store.ts';
import type { RequestHandler } from './$types';

const LIMIT = 10;

/** Distinct display names matching `?q=`, names starting with it first. */
export const GET: RequestHandler = ({ url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	if (!search) return json([]);
	return json([...new Set(listHumans(search, LIMIT, 0).map((h) => h.human))]);
};
