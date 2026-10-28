import { db } from '../db/index.ts';
import { APP_ENV_VARS, validateEnvVarName } from '../ftp/config.ts';
import getSql from './sql/get-setting.sql?raw';
import saveSql from './sql/save-setting.sql?raw';
import deleteSql from './sql/delete-setting.sql?raw';

export type AppSetting = 'CLAUDE_TOKEN_ENV_VAR' | 'CLAUDE_MODE' | 'MEDIUM_TOKEN_ENV_VAR';

/** How the app reaches Claude: the API with a token, or the local Claude Code login. */
export type ClaudeMode = 'API' | 'LOCAL';

const statements = {
	get: db.prepare<[{ app_setting: string }], { value: string }>(getSql),
	save: db.prepare(saveSql),
	delete: db.prepare(deleteSql)
};

export function getSetting(setting: AppSetting): string | undefined {
	return statements.get.get({ app_setting: setting })?.value;
}

export function saveSetting(setting: AppSetting, value: string) {
	statements.save.run({ app_setting: setting, value });
}

export function deleteSetting(setting: AppSetting) {
	statements.delete.run({ app_setting: setting });
}

export function validateClaudeTokenEnvVar(name: string): string | undefined {
	return validateEnvVarName(name, APP_ENV_VARS, 'the Claude API token');
}

/** The Claude API token, read from the environment when it is needed; it is never stored. */
export function claudeToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
	const name = getSetting('CLAUDE_TOKEN_ENV_VAR');
	if (!name || validateClaudeTokenEnvVar(name)) return undefined;
	return env[name] || undefined;
}

export function claudeMode(): ClaudeMode {
	return getSetting('CLAUDE_MODE') === 'LOCAL' ? 'LOCAL' : 'API';
}

export function validateMediumTokenEnvVar(name: string): string | undefined {
	return validateEnvVarName(name, undefined, 'the Medium integration token');
}

/** The Medium integration token, read from the environment when it is needed; it is never stored. */
export function mediumToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
	const name = getSetting('MEDIUM_TOKEN_ENV_VAR');
	if (!name || validateMediumTokenEnvVar(name)) return undefined;
	return env[name] || undefined;
}
