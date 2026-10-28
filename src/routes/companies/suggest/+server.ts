import { json } from '@sveltejs/kit';
import { listCompanies } from '#lib/server/companies/store.ts';
import type { RequestHandler } from './$types';

const LIMIT = 10;

/** Distinct company names matching `?q=`, names starting with it first. */
export const GET: RequestHandler = ({ url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	if (!search) return json([]);
	return json([...new Set(listCompanies(search, LIMIT, 0).map((c) => c.company))]);
};
