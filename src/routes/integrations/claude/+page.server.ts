import { fail } from '@sveltejs/kit';
import { checkClaudeCode, claudeErrorMessage } from '#lib/server/claude.ts';
import { claudeView } from '#lib/server/integrations/views.ts';
import {
	deleteSetting,
	saveSetting,
	validateClaudeTokenEnvVar
} from '#lib/server/settings/store.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ claude: claudeView() });

export const actions: Actions = {
	saveClaude: async ({ request }) => {
		const form = await request.formData();
		const mode = form.get('mode');
		const value = form.get('tokenEnvVar');
		const tokenEnvVar = typeof value === 'string' ? value.trim() : '';
		if (mode === 'LOCAL') {
			saveSetting('CLAUDE_MODE', 'LOCAL');
			return { claudeSaved: 'LOCAL' as const };
		}
		if (mode !== 'API')
			return fail(400, { claude: { values: { tokenEnvVar }, error: 'Choose how to run Claude.' } });
		const error = validateClaudeTokenEnvVar(tokenEnvVar);
		if (error) return fail(400, { claude: { values: { tokenEnvVar }, error } });
		saveSetting('CLAUDE_TOKEN_ENV_VAR', tokenEnvVar);
		saveSetting('CLAUDE_MODE', 'API');
		return { claudeSaved: 'API' as const };
	},

	removeClaude: async () => {
		deleteSetting('CLAUDE_TOKEN_ENV_VAR');
		deleteSetting('CLAUDE_MODE');
		return { claudeRemoved: true };
	},

	checkClaudeCode: async () => {
		try {
			const account = await checkClaudeCode();
			return { claudeCodeChecked: account };
		} catch (error) {
			return fail(502, { claudeCodeError: claudeErrorMessage(error) });
		}
	}
};
