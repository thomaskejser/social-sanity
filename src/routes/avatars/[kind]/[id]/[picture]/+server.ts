import { error } from '@sveltejs/kit';
import { getHumanAvatar } from '#lib/server/avatars/store.ts';
import type { RequestHandler } from './$types';

/** One of a human's pictures; companies and channels have only the one under /avatars. */
export const GET: RequestHandler = ({ params }) => {
	const id = Number(params.id);
	const picture = Number(params.picture);
	if (params.kind !== 'human' || !Number.isInteger(id) || !Number.isInteger(picture))
		error(404, 'No such picture');
	const avatar = getHumanAvatar(id, picture);
	if (!avatar) error(404, 'No such picture');
	return new Response(new Uint8Array(avatar.image), {
		headers: {
			'Content-Type': avatar.contentType,
			'Cache-Control': 'private, max-age=86400',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
