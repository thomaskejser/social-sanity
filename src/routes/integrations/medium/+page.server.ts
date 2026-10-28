import { fail } from '@sveltejs/kit';
import { mediumProfileFeedUrl } from '#lib/medium.ts';
import { fetchMediumUser, MediumError } from '#lib/server/integrations/medium.ts';
import { MediumExportError, readMediumExport } from '#lib/server/medium/export.ts';
import { feedReading, importFollows, readImportedFeeds } from '#lib/server/medium/import.ts';
import { mediumView } from '#lib/server/integrations/views.ts';
import {
	deleteSetting,
	getSetting,
	mediumToken,
	saveSetting,
	validateMediumTokenEnvVar
} from '#lib/server/settings/store.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ medium: mediumView(), feedReading: feedReading() });

export const actions: Actions = {
	saveMedium: async ({ request }) => {
		const value = (await request.formData()).get('tokenEnvVar');
		const tokenEnvVar = typeof value === 'string' ? value.trim() : '';
		const error = validateMediumTokenEnvVar(tokenEnvVar);
		if (error) return fail(400, { medium: { values: { tokenEnvVar }, error } });
		saveSetting('MEDIUM_TOKEN_ENV_VAR', tokenEnvVar);
		return { mediumSaved: true };
	},

	uploadExport: async ({ request }) => {
		const file = (await request.formData()).get('archive');
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { exportError: 'Choose the ZIP file Medium sent you.' });
		let archive;
		try {
			archive = readMediumExport(new Uint8Array(await file.arrayBuffer()));
		} catch (error) {
			if (!(error instanceof MediumExportError)) throw error;
			return fail(400, { exportError: error.message });
		}
		const imported = importFollows(archive.follows);
		readImportedFeeds(imported);
		return { mediumExport: { ...archive, imported } };
	},

	removeMedium: async () => {
		deleteSetting('MEDIUM_TOKEN_ENV_VAR');
		return { mediumRemoved: true };
	},

	checkMedium: async () => {
		const token = mediumToken();
		if (!token) {
			const name = getSetting('MEDIUM_TOKEN_ENV_VAR');
			return fail(400, {
				mediumCheckError: name
					? `${name} is not set. Add it to the server environment and restart the app.`
					: 'Save the name of the environment variable first.'
			});
		}
		try {
			const user = await fetchMediumUser(token);
			return {
				mediumChecked: {
					username: user.username,
					name: user.name,
					feedUrl: mediumProfileFeedUrl(user.username)
				}
			};
		} catch (error) {
			if (error instanceof MediumError) return fail(502, { mediumCheckError: error.message });
			throw error;
		}
	}
};
