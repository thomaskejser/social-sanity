import { error, json } from '@sveltejs/kit';
import { conversionPreview } from '#lib/server/members/convert.ts';
import { isMemberKind } from '#lib/groups/member.ts';
import type { RequestHandler } from './$types';

/** What turning `?kind=&id=` into `?to=` keeps and drops, for the confirmation dialog. */
export const GET: RequestHandler = ({ url }) => {
	const kind = url.searchParams.get('kind');
	const to = url.searchParams.get('to');
	const id = Number(url.searchParams.get('id'));
	if (!isMemberKind(kind) || !isMemberKind(to) || !Number.isInteger(id)) error(400, 'Bad request');
	const preview = conversionPreview(kind, id, to);
	if (!preview) error(404, 'Nothing to convert');
	return json(preview);
};
