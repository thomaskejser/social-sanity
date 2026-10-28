import { fail } from '@sveltejs/kit';
import { setChannelKudos } from '#lib/server/channels/store.ts';
import { setCompanyKudos } from '#lib/server/companies/store.ts';
import { listUpcomingBirthdays } from '#lib/server/humans/birthdays.ts';
import { idField, kudosField } from '#lib/server/humans/form.ts';
import { setHumanKudos } from '#lib/server/humans/store.ts';
import { fetchAllSources } from '#lib/server/sources/fetch.ts';
import {
	listFeed,
	listSources,
	markArticleRead,
	setPublisherKudos
} from '#lib/server/sources/store.ts';
import { makeTaskAction } from '#lib/server/tasks/make-task.ts';
import type { Actions, PageServerLoad } from './$types';

const FEED_DAYS = 30;
const FEED_LIMIT = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Birthdays show from this many days before until the day itself. */
const BIRTHDAY_DAYS = 3;

const SET_KUDOS = {
	human: setHumanKudos,
	company: setCompanyKudos,
	channel: setChannelKudos,
	publisher: setPublisherKudos
};

export const load: PageServerLoad = () => ({
	feed: listFeed(Date.now() - FEED_DAYS * DAY_MS, FEED_LIMIT),
	birthdays: listUpcomingBirthdays(BIRTHDAY_DAYS),
	feedDays: FEED_DAYS,
	sourceCount: listSources().length
});

export const actions: Actions = {
	refresh: async () => ({ refreshed: await fetchAllSources() }),

	kudos: async ({ request }) => {
		const form = await request.formData();
		const ownerKind = form.get('ownerKind');
		const ownerId = idField(form, 'ownerId');
		const kudos = kudosField(form);
		if (!ownerId || !(typeof ownerKind === 'string' && Object.hasOwn(SET_KUDOS, ownerKind)))
			return fail(400, { error: 'Unknown human, company or channel.' });
		if (kudos === undefined) return fail(400, { error: 'Kudos must be 0 to 10.' });
		SET_KUDOS[ownerKind as keyof typeof SET_KUDOS](ownerId, kudos);
	},

	markRead: async ({ request }) => {
		const articleId = idField(await request.formData(), 'articleId');
		if (!articleId) return fail(404, { error: 'No such article.' });
		markArticleRead(articleId);
	},

	toTask: makeTaskAction
};
