import { fail, redirect, type Action } from '@sveltejs/kit';
import { isMemberKind, type MemberKind } from '#lib/groups/member.ts';
import { convertMember } from './convert.ts';

const PAGES = { human: '/humans', company: '/companies', channel: '/channels' };

/** Moves the record of a detail page to the kind in the form's `to`, and opens its new page. */
export function convertAction(kind: MemberKind): Action {
	return async ({ params, request }) => {
		const id = Number(params.id);
		const to = (await request.formData()).get('to');
		if (!Number.isInteger(id) || !isMemberKind(to) || to === kind)
			return fail(400, { error: 'Choose what to make it.' });
		const newId = convertMember(kind, id, to);
		redirect(303, `${PAGES[to]}/${newId}`);
	};
}
