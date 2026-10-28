import { readPassword } from '../ftp/config.ts';
import { getFtpServer } from '../ftp/store.ts';
import { getGitRepo, tokenSet } from '../repo/store.ts';
import { claudeMode, claudeToken, getSetting, mediumToken } from '../settings/store.ts';
import { ftpStatus } from '#lib/integrations/ftp-status.ts';
import { repoStatus } from '#lib/integrations/repo-status.ts';
import { integrationStatus, type IntegrationStatus } from '#lib/integrations/status.ts';
import type { IntegrationLogo } from '#lib/integrations/logo.ts';
import { socialLogos, type SocialBrand } from '#lib/social-logos/social-logos.ts';
import { listAccounts } from './accounts.ts';
import { redirectUriFor } from './redirect-uri.ts';
import { getIntegration, listIntegrations } from './registry.ts';
import type { IntegrationId } from './types.ts';

function logoOf(id: IntegrationId): IntegrationLogo {
	if (Object.hasOwn(socialLogos, id)) return { brand: id as SocialBrand };
	if (id === 'google') return { product: 'google-contacts' };
	throw new Error(`No logo for integration ${id}`);
}

/** What the browser may see of an OAuth integration; never tokens or the client secret. */
export function oauthView(id: IntegrationId, origin: string) {
	const { integration, configured, clientId } = getIntegration(id)!;
	// Other set-up integrations of the same family, whose app this one can reuse.
	const reusable =
		configured || !integration.family
			? []
			: listIntegrations()
					.filter(
						(other) =>
							other.integration.id !== id &&
							other.configured &&
							other.integration.family?.id === integration.family!.id
					)
					.map((other) => ({
						id: other.integration.id,
						name: other.integration.name,
						clientId: other.clientId!
					}));
	const account = listAccounts().find((a) => a.platform === id);
	return {
		id: integration.id,
		name: integration.name,
		logo: logoOf(integration.id),
		note: integration.note ?? null,
		consoleUrl: integration.consoleUrl,
		setup: integration.setup,
		clientId,
		redirectUri: redirectUriFor(integration.id, origin),
		autoRefresh: !!integration.refresh,
		configured,
		reusable,
		api: integration.family?.api ?? null,
		account: account
			? {
					displayName: account.displayName,
					expiresAt: account.expiresAt,
					connectedAt: account.connectedAt,
					scopes: account.scopes.split(' ').filter(Boolean)
				}
			: null
	};
}

export function ftpView() {
	const ftp = getFtpServer();
	if (!ftp) return null;
	return {
		protocol: ftp.protocol,
		host: ftp.host,
		port: ftp.port,
		username: ftp.username,
		passwordEnvVar: ftp.passwordEnvVar,
		encryption: ftp.encryption,
		remoteDir: ftp.remoteDir,
		publicUrl: ftp.publicUrl,
		hostKeyFingerprint: ftp.hostKeyFingerprint,
		// Only whether the variable is set — never its value.
		passwordSet: readPassword(ftp.passwordEnvVar) !== undefined,
		lastTestedAt: ftp.lastTestedAt,
		lastTestOk: ftp.lastTestOk,
		lastTestMessage: ftp.lastTestMessage
	};
}

export function repoView() {
	const repo = getGitRepo();
	if (!repo) return null;
	return {
		url: repo.url,
		branch: repo.branch,
		postsDir: repo.postsDir,
		tokenEnvVar: repo.tokenEnvVar,
		tokenUsername: repo.tokenUsername,
		authorName: repo.authorName,
		authorEmail: repo.authorEmail,
		// Only whether the variable is set — never its value.
		tokenSet: tokenSet(repo),
		lastSyncAt: repo.lastSyncAt,
		lastSyncOk: repo.lastSyncOk,
		lastSyncMessage: repo.lastSyncMessage
	};
}

export function claudeView() {
	return {
		/** Null until a choice is saved; a saved token variable alone means the API. */
		mode: getSetting('CLAUDE_MODE') ? claudeMode() : null,
		tokenEnvVar: getSetting('CLAUDE_TOKEN_ENV_VAR') ?? null,
		tokenSet: claudeToken() !== undefined
	};
}

function claudeStatus(claude: ReturnType<typeof claudeView>): IntegrationStatus {
	if (claude.mode === 'LOCAL') return { tone: 'ok', label: 'Runs locally' };
	if (!claude.tokenEnvVar) return { tone: 'neutral', label: 'Not configured' };
	return claude.tokenSet
		? { tone: 'ok', label: 'Token set' }
		: { tone: 'danger', label: 'Token variable not set' };
}

export function mediumView() {
	return {
		tokenEnvVar: getSetting('MEDIUM_TOKEN_ENV_VAR') ?? null,
		tokenSet: mediumToken() !== undefined
	};
}

function mediumStatus(medium: ReturnType<typeof mediumView>): IntegrationStatus {
	if (!medium.tokenEnvVar) return { tone: 'neutral', label: 'Feeds only' };
	return medium.tokenSet
		? { tone: 'ok', label: 'Token set' }
		: { tone: 'danger', label: 'Token variable not set' };
}

export type IntegrationIcon =
	{ brand: SocialBrand } | { icon: 'contacts' | 'claude' | 'repository' | 'blog' };

export type IntegrationSlug =
	IntegrationId | 'medium' | 'blog-site' | 'posts-repository' | 'claude';

export type IntegrationSummary = {
	/** The integration's own page, under /integrations. */
	slug: IntegrationSlug;
	name: string;
	logo: IntegrationLogo;
	status: IntegrationStatus;
};

export function integrationSummaries(): IntegrationSummary[] {
	const accounts = listAccounts();
	const oauth = listIntegrations().map(({ integration, configured }) => {
		return {
			slug: integration.id,
			name: integration.name,
			logo: logoOf(integration.id),
			status: integrationStatus(
				configured,
				accounts.find((a) => a.platform === integration.id) ?? null
			)
		};
	});
	return [
		...oauth,
		{
			slug: 'medium',
			name: 'Medium',
			logo: { brand: 'medium' },
			status: mediumStatus(mediumView())
		},
		{
			slug: 'blog-site',
			name: 'Blog site (FTP / SFTP)',
			logo: { icon: 'blog' },
			status: ftpStatus(ftpView())
		},
		{
			slug: 'posts-repository',
			name: 'Posts repository (git)',
			logo: { icon: 'repository' },
			status: repoStatus(repoView())
		},
		{
			slug: 'claude',
			name: 'AI (Claude)',
			logo: { icon: 'claude' },
			status: claudeStatus(claudeView())
		}
	];
}
