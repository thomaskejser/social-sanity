import Anthropic from '@anthropic-ai/sdk';
import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_ENV_VARS } from './ftp/config.ts';
import { claudeMode, claudeToken, getSetting } from './settings/store.ts';

export const CLAUDE_MODEL = 'claude-opus-5-5';

const MAX_CONTINUATIONS = 5;

export class ClaudeError extends Error {}

/** One question to Claude, answered with JSON matching `answer.schema`. */
export type ClaudeTask = {
	system: string;
	prompt: string;
	/** With the API, a strict tool Claude calls once; with Claude Code, the structured output. */
	answer: { name: string; description: string; schema: Anthropic.Beta.BetaTool['input_schema'] };
	effort: 'low' | 'medium';
	/** Lets Claude search the web, up to this many times. */
	webSearches?: number;
	/** Text of the error when Claude refuses. */
	refusal: string;
};

/** Asks Claude through the API token or the local Claude Code login, as chosen under Integrations. */
export function askClaude(task: ClaudeTask): Promise<unknown> {
	return claudeMode() === 'LOCAL' ? askClaudeCode(task) : askClaudeApi(task);
}

/** Whether agentic features can run: Claude Code is chosen, or the API token is available. */
export function claudeReady(): boolean {
	return claudeMode() === 'LOCAL' || claudeToken() !== undefined;
}

async function askClaudeApi(task: ClaudeTask): Promise<unknown> {
	const apiKey = claudeToken();
	if (!apiKey)
		throw new ClaudeError(
			'Set up AI on the Integrations page, and make sure the token variable is set.'
		);
	const client = new Anthropic({ apiKey });
	const answer: Anthropic.Beta.BetaTool = {
		name: task.answer.name,
		description: task.answer.description,
		strict: true,
		input_schema: task.answer.schema
	};
	const tools: Anthropic.Beta.BetaToolUnion[] = task.webSearches
		? [{ type: 'web_search_20260209', name: 'web_search', max_uses: task.webSearches }, answer]
		: [answer];
	const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: task.prompt }];

	for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
		const response = await client.beta.messages.create({
			model: CLAUDE_MODEL,
			max_tokens: 16000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			output_config: { effort: task.effort },
			system: task.system,
			tools,
			tool_choice: { type: 'auto' },
			messages
		});
		if (response.stop_reason === 'refusal') throw new ClaudeError(task.refusal);

		const call = response.content.find(
			(block): block is Anthropic.Beta.BetaToolUseBlock =>
				block.type === 'tool_use' && block.name === answer.name
		);
		if (call) return call.input;

		if (response.stop_reason !== 'pause_turn')
			throw new ClaudeError('The AI finished without answering. Try again.');
		messages.push({ role: 'assistant', content: response.content });
	}
	throw new ClaudeError('The AI was still searching after several rounds. Try again.');
}

/**
 * The environment for Claude Code, without the API token or the app's own secrets, so it signs
 * in with the user's Claude login and never sees what it doesn't need.
 */
export function claudeCodeEnv(
	env: NodeJS.ProcessEnv = process.env
): Record<string, string | undefined> {
	const hidden = new Set([
		...APP_ENV_VARS,
		'ANTHROPIC_API_KEY',
		'ANTHROPIC_AUTH_TOKEN',
		getSetting('CLAUDE_TOKEN_ENV_VAR')
	]);
	return {
		...Object.fromEntries(Object.entries(env).filter(([name]) => !hidden.has(name))),
		CLAUDE_AGENT_SDK_CLIENT_APP: 'social-sanity'
	};
}

function claudeCodeFailure(result: SDKResultMessage): string {
	if (result.subtype === 'success') return `Claude Code: ${result.result}`;
	if (result.subtype === 'error_max_turns')
		return 'The AI was still searching after several rounds. Try again.';
	if (result.subtype === 'error_max_structured_output_retries')
		return 'The AI did not answer in the expected form. Try again.';
	return `Claude Code failed: ${result.errors.join(' ') || result.subtype}`;
}

/**
 * Runs Claude Code through the Agent SDK in an empty folder that is deleted afterwards. It gets no
 * tools except web search when the task allows it, loads no settings, and keeps no session.
 */
async function runClaudeCode(
	task: Omit<ClaudeTask, 'answer'> & { answer?: ClaudeTask['answer'] },
	onStart?: (session: ReturnType<typeof query>) => Promise<void>
): Promise<SDKResultMessage> {
	const cwd = await mkdtemp(join(tmpdir(), 'social-sanity-claude-'));
	const tools = task.webSearches ? ['WebSearch'] : [];
	try {
		const session = query({
			prompt: task.prompt,
			options: {
				model: CLAUDE_MODEL,
				systemPrompt: task.system,
				effort: task.effort,
				tools,
				allowedTools: tools,
				permissionMode: 'dontAsk',
				settingSources: [],
				persistSession: false,
				cwd,
				env: claudeCodeEnv(),
				maxTurns: (task.webSearches ?? 0) + 3,
				...(task.answer && {
					outputFormat: { type: 'json_schema' as const, schema: { ...task.answer.schema } }
				})
			}
		});
		for await (const message of session) {
			if (message.type === 'system' && message.subtype === 'init') await onStart?.(session);
			if (message.type === 'result') return message;
		}
		throw new ClaudeError('Claude Code stopped without answering.');
	} catch (error) {
		if (error instanceof ClaudeError) throw error;
		throw new ClaudeError(
			`Could not run Claude Code: ${error instanceof Error ? error.message : String(error)}`
		);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}

async function askClaudeCode(task: ClaudeTask): Promise<unknown> {
	const result = await runClaudeCode(task);
	if (result.subtype === 'success' && !result.is_error && result.structured_output !== undefined)
		return result.structured_output;
	throw new ClaudeError(claudeCodeFailure(result));
}

export type ClaudeCodeAccount = { email: string; plan: string };

/** Sends Claude Code a one-word prompt to check that it runs and is signed in. */
export async function checkClaudeCode(): Promise<ClaudeCodeAccount> {
	let account: ClaudeCodeAccount = { email: '', plan: '' };
	const result = await runClaudeCode(
		{ system: 'Reply with the single word OK.', prompt: 'OK?', effort: 'low', refusal: '' },
		async (session) => {
			const info = await session.accountInfo();
			account = { email: info.email ?? '', plan: info.subscriptionType ?? '' };
		}
	);
	if (result.subtype !== 'success' || result.is_error)
		throw new ClaudeError(claudeCodeFailure(result));
	return account;
}

/** Turns an SDK error into a message for the user. */
export function claudeErrorMessage(error: unknown): string {
	if (error instanceof ClaudeError) return error.message;
	if (error instanceof Anthropic.AuthenticationError)
		return 'Claude rejected the API token. Check the token in its environment variable.';
	if (error instanceof Anthropic.PermissionDeniedError)
		return 'The Claude API token is not allowed to use this model or web search.';
	if (error instanceof Anthropic.RateLimitError)
		return 'The Claude API is rate limiting requests. Try again in a minute.';
	if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API.';
	if (error instanceof Anthropic.APIError)
		return `Claude API error ${error.status}: ${error.message}`;
	throw error;
}
