<script lang="ts" module>
	export type RepoView = {
		url: string;
		branch: string;
		postsDir: string;
		tokenEnvVar: string | null;
		tokenUsername: string;
		authorName: string;
		authorEmail: string;
		tokenSet: boolean;
		lastSyncAt: number | null;
		lastSyncOk: boolean | null;
		lastSyncMessage: string | null;
	};

	export type RepoFormState = {
		values: Record<string, string>;
		errors: Record<string, string | undefined>;
	};
</script>

<script lang="ts">
	import { repoStatus } from '#lib/integrations/repo-status.ts';
	import Alert from './Alert.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import DateTime from './DateTime.svelte';
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';

	let { repo, form }: { repo: RepoView | null; form: RepoFormState | null } = $props();

	const status = $derived(repoStatus(repo));
	const values = $derived(
		form?.values ?? {
			url: repo?.url ?? '',
			branch: repo?.branch ?? 'main',
			postsDir: repo?.postsDir ?? 'posts',
			tokenEnvVar: repo?.tokenEnvVar ?? '',
			tokenUsername: repo?.tokenUsername ?? 'x-access-token',
			authorName: repo?.authorName ?? 'Social Sanity',
			authorEmail: repo?.authorEmail ?? ''
		}
	);
	const errors = $derived(form?.errors ?? {});
</script>

<article class="card" aria-labelledby="integration-repo">
	<header>
		<h2 id="integration-repo">Posts repository (git)</h2>
		<Badge tone={status.tone}>{status.label}</Badge>
	</header>

	<p class="card-note">
		Posts are Markdown files in this repository, one folder per post with its images and videos. New
		posts, text edits and publish results are committed and pushed; the app pulls every 5 minutes.
		SSH URLs use this machine's SSH keys. For HTTPS, put a token in an environment variable and
		enter the variable's name; the token is never stored.
	</p>

	{#if repo && !repo.tokenSet}
		<Alert tone="warn">
			<code>{repo.tokenEnvVar}</code> is not set. Add it to <code>.env</code> (or the server environment)
			and restart the app.
		</Alert>
	{/if}
	{#if repo?.lastSyncAt}
		<p class="card-note">
			Last pull (<DateTime epochMs={repo.lastSyncAt} withTime />): {repo.lastSyncMessage}
		</p>
	{/if}

	<Form
		action="?/saveRepo"
		label="Posts repository settings"
		variant="settings"
		resetOnSuccess={false}
	>
		<TextField
			label="Clone URL"
			name="url"
			value={values.url}
			placeholder="git@github.com:you/social-posts.git"
			required
			hint="https://…, ssh://… or git@host:path"
			error={errors.url}
		/>
		<TextField label="Branch" name="branch" value={values.branch} required error={errors.branch} />
		<TextField
			label="Posts folder"
			name="postsDir"
			value={values.postsDir}
			hint="Folder inside the repository; empty for the top level."
			error={errors.postsDir}
		/>
		<TextField
			label="HTTPS token environment variable (optional)"
			name="tokenEnvVar"
			value={values.tokenEnvVar}
			placeholder="SOCIAL_SANITY_REPO_TOKEN"
			hint="Leave empty for SSH or public repositories."
			error={errors.tokenEnvVar}
		/>
		<TextField
			label="Token username"
			name="tokenUsername"
			value={values.tokenUsername}
			hint="GitHub: x-access-token. GitLab: oauth2. Bitbucket: x-token-auth."
			error={errors.tokenUsername}
		/>
		<TextField
			label="Commit author name"
			name="authorName"
			value={values.authorName}
			error={errors.authorName}
		/>
		<TextField
			label="Commit author email"
			name="authorEmail"
			type="email"
			value={values.authorEmail}
			required
			error={errors.authorEmail}
		/>
		<footer>
			<Button type="submit">Save and pull</Button>
			{#if repo}
				<Button type="submit" action="secondary" formaction="?/testRepo" disabled={!repo.tokenSet}>
					Test connection
				</Button>
				<Button type="submit" action="secondary" formaction="?/syncRepo" disabled={!repo.tokenSet}>
					Pull now
				</Button>
				<Button type="submit" action="destructive" formaction="?/removeRepo">Remove</Button>
			{/if}
		</footer>
	</Form>
</article>
