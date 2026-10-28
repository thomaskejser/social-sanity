import { describe, expect, it, vi } from 'vitest';

vi.mock('./settings/store.ts', () => ({
	claudeMode: () => 'LOCAL',
	claudeToken: () => undefined,
	getSetting: (setting: string) => (setting === 'CLAUDE_TOKEN_ENV_VAR' ? 'MY_CLAUDE' : undefined)
}));

const { claudeCodeEnv } = await import('./claude.ts');
const { APP_ENV_VARS } = await import('./ftp/config.ts');

describe('claudeCodeEnv', () => {
	it('keeps ordinary variables and names the app', () => {
		const env = claudeCodeEnv({ PATH: '/bin', HOME: '/home/me' });
		expect(env.PATH).toBe('/bin');
		expect(env.HOME).toBe('/home/me');
		expect(env.CLAUDE_AGENT_SDK_CLIENT_APP).toBe('social-sanity');
	});

	it('hides API tokens, so Claude Code uses the Claude login', () => {
		const env = claudeCodeEnv({
			ANTHROPIC_API_KEY: 'a',
			ANTHROPIC_AUTH_TOKEN: 'b',
			MY_CLAUDE: 'c'
		});
		expect(env).not.toHaveProperty('ANTHROPIC_API_KEY');
		expect(env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');
		expect(env).not.toHaveProperty('MY_CLAUDE');
	});

	it("hides the app's own secrets", () => {
		const secrets = Object.fromEntries([...APP_ENV_VARS].map((name) => [name, 'secret']));
		const env = claudeCodeEnv(secrets);
		for (const name of APP_ENV_VARS) expect(env).not.toHaveProperty(name);
	});
});
