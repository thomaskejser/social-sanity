import { error } from '@sveltejs/kit';
import { getAvatar } from '#lib/server/avatars/store.ts';
import { isMemberKind } from '#lib/groups/member.ts';
import type { RequestHandler } from './$types';

const OWNER = {
	human: (humanId: number) => ({ humanId }),
	company: (companyId: number) => ({ companyId }),
	channel: (channelId: number) => ({ channelId })
};

/** The picture shown for a human, company or channel. A human can switch it, so it is kept briefly. */
export const GET: RequestHandler = ({ params }) => {
	const id = Number(params.id);
	if (!isMemberKind(params.kind) || !Number.isInteger(id)) error(404, 'No such picture');
	const avatar = getAvatar(OWNER[params.kind](id));
	if (!avatar) error(404, 'No such picture');
	return new Response(new Uint8Array(avatar.image), {
		headers: {
			'Content-Type': avatar.contentType,
			'Cache-Control': 'private, max-age=60',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
