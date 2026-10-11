import { fail, redirect } from '@sveltejs/kit';
import { MAX_MEDIA_FILES, uploadProblem } from '#lib/media.ts';
import { createPost } from '#lib/server/posts/repo-posts.ts';
import { getGitRepo } from '#lib/server/repo/store.ts';
import type { Actions, PageServerLoad } from './$types';

type FormErrors = { title?: string; text?: string; media?: string; form?: string };

export const load: PageServerLoad = () => ({ repoConfigured: getGitRepo() !== undefined });

export const actions: Actions = {
	default: async ({ request }) => {
		const repo = getGitRepo();
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const text = String(form.get('text') ?? '');
		const files = form
			.getAll('media')
			.filter((value): value is File => value instanceof File && value.size > 0);

		const errors: FormErrors = {};
		if (!repo) errors.form = 'Add a posts repository on the Integrations page first.';
		if (title.length > 200) errors.title = 'Keep the title under 200 characters.';
		if (!text.trim() && files.length === 0) errors.text = 'Write some text or add media.';
		if (files.length > MAX_MEDIA_FILES) {
			errors.media = `Add at most ${MAX_MEDIA_FILES} files.`;
		} else {
			const problems = files.map(uploadProblem).filter(Boolean);
			if (problems.length > 0) errors.media = problems.join(' ');
		}
		if (!repo || Object.keys(errors).length > 0) return fail(400, { title, text, errors });

		let result;
		try {
			result = await createPost(repo, { title, text, files });
		} catch (error) {
			const errors: FormErrors = { form: error instanceof Error ? error.message : String(error) };
			return fail(502, { title, text, errors });
		}
		const query = result.pushError ? '?pushFailed=1' : '';
		redirect(303, `/posts/${result.id}${query}`);
	}
};
