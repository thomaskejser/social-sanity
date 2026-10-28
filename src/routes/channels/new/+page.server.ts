import { fail, redirect } from '@sveltejs/kit';
import { parseChannelForm } from '#lib/server/channels/form.ts';
import { createChannel } from '#lib/server/channels/store.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const result = parseChannelForm(await request.formData());
		if (!result.ok) return fail(400, { channelErrors: result.errors });
		redirect(303, `/channels/${createChannel(result.input)}`);
	}
};
