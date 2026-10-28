import { error } from '@sveltejs/kit';
import { readerDocument } from '#lib/server/sources/reader.ts';
import { getArticle } from '#lib/server/sources/store.ts';
import { makeTaskAction } from '#lib/server/tasks/make-task.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const article = getArticle(Number(params.id));
	if (!article) error(404, 'No such article');
	return {
		article: {
			articleId: article.articleId,
			article: article.article,
			owner: article.owner,
			url: article.url,
			publishedAt: article.publishedAt,
			videoId: article.videoId,
			summary: article.summary,
			document: article.contentHtml ? readerDocument(article.contentHtml, article.url) : ''
		}
	};
};

export const actions: Actions = {
	toTask: makeTaskAction
};
