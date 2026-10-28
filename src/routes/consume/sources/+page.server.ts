import { fail } from '@sveltejs/kit';
import { idField, kudosField } from '#lib/server/humans/form.ts';
import {
	addSource,
	createPublisher,
	deletePublisher,
	deleteSource,
	isPublisherKind,
	listPublishers,
	listSources,
	parseSourceUri,
	setPublisherKudos
} from '#lib/server/sources/store.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const sources = listSources();
	return {
		publishers: listPublishers().map((p) => ({
			...p,
			sources: sources.filter((s) => s.publisherId === p.publisherId)
		})),
		humanSources: sources.filter((s) => s.humanId !== null)
	};
};

export const actions: Actions = {
	createPublisher: async ({ request }) => {
		const form = await request.formData();
		const publisher = String(form.get('publisher') ?? '').trim();
		const kind = form.get('publisherKind');
		if (!publisher) return fail(400, { publisherError: 'Name it.' });
		if (!isPublisherKind(kind)) return fail(400, { publisherError: 'Choose a kind.' });
		createPublisher(publisher, kind);
	},

	deletePublisher: async ({ request }) => {
		const publisherId = idField(await request.formData(), 'publisherId');
		if (!publisherId) return fail(400, { error: 'Unknown source.' });
		deletePublisher(publisherId);
	},

	kudos: async ({ request }) => {
		const form = await request.formData();
		const publisherId = idField(form, 'publisherId');
		const kudos = kudosField(form);
		if (!publisherId || kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		setPublisherKudos(publisherId, kudos);
	},

	addSource: async ({ request }) => {
		const form = await request.formData();
		const publisherId = idField(form, 'publisherId');
		const uri = parseSourceUri(String(form.get('uri') ?? ''));
		if (!publisherId) return fail(400, { error: 'Unknown source.' });
		if (!uri)
			return fail(400, {
				sourceError: { publisherId, message: 'Enter a full http:// or https:// address.' }
			});
		addSource({ publisherId }, uri);
	},

	removeSource: async ({ request }) => {
		const contentSourceId = idField(await request.formData(), 'contentSourceId');
		if (!contentSourceId) return fail(400, { error: 'Unknown content source.' });
		deleteSource(contentSourceId);
	}
};
