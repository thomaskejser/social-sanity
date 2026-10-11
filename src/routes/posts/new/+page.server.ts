import { fail, redirect } from '@sveltejs/kit';
import { MAX_MEDIA_FILES, uploadProblem } from '#lib/media.ts';
import { deleteMedia, saveUpload, type StoredMedia } from '#lib/server/media/store.ts';
import { createPost } from '#lib/server/posts/store.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const text = String(form.get('text') ?? '');
		const files = form
			.getAll('media')
			.filter((value): value is File => value instanceof File && value.size > 0);

		const errors: { text?: string; media?: string } = {};
		if (!text.trim() && files.length === 0) errors.text = 'Write some text or add media.';
		if (files.length > MAX_MEDIA_FILES) {
			errors.media = `Add at most ${MAX_MEDIA_FILES} files.`;
		} else {
			const problems = files.map(uploadProblem).filter(Boolean);
			if (problems.length > 0) errors.media = problems.join(' ');
		}
		if (errors.text || errors.media) return fail(400, { text, errors });

		const saved: StoredMedia[] = [];
		let id: number;
		try {
			for (const file of files) saved.push(await saveUpload(file));
			id = createPost(text, saved);
		} catch (cause) {
			await deleteMedia(saved.map((m) => m.fileName));
			throw cause;
		}
		redirect(303, `/posts/${id}`);
	}
};
