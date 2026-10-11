<script lang="ts">
	import { hasErrors, platformFormat, type PlatformId } from '#lib/format/index.ts';
	import { charCount } from '#lib/format/text.ts';
	import { targetStatus, type TargetStatus } from '#lib/posts/status.ts';
	import Alert from './Alert.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import type { MediaView } from './MediaGallery.svelte';
	import PostPreview from './PostPreview.svelte';
	import TextArea from './TextArea.svelte';

	let {
		platformId,
		author,
		accountProblem,
		media,
		generated,
		savedText,
		status,
		error,
		remoteUrl
	}: {
		platformId: PlatformId;
		author: string | null;
		accountProblem: string | null;
		media: MediaView[];
		/** The text the formatter produces from the shared draft; "Reset" restores it. */
		generated: string;
		savedText: string;
		status: TargetStatus;
		error: string | null;
		remoteUrl: string | null;
	} = $props();

	const platform = $derived(platformFormat(platformId));
	let text = $derived(savedText);
	const locked = $derived(status === 'published' || status === 'publishing');
	const issues = $derived(platform.check(text, media));
	const textErrors = $derived(
		issues.filter((i) => i.field === 'text' && i.level === 'error').map((i) => i.message)
	);
	const notices = $derived(issues.filter((i) => i.field === 'media' || i.level === 'warning'));
	const badge = $derived(targetStatus(status, accountProblem, hasErrors(issues)));
	const ready = $derived(!locked && !accountProblem && !hasErrors(issues));
</script>

<article class="card" aria-labelledby="post-{platformId}">
	<header>
		<h2 id="post-{platformId}">{platform.name}</h2>
		<Badge tone={badge.tone}>{badge.label}</Badge>
	</header>

	<PostPreview {platform} author={author ?? 'Your account'} {text} {media} />

	<TextArea
		label="{platform.name} text"
		name="text-{platformId}"
		bind:value={text}
		rows={8}
		readonly={locked}
		hint="{charCount(text)} / {platform.maxLength} characters"
		error={textErrors.length > 0 ? textErrors.join(' ') : undefined}
	/>

	{#each notices as issue (issue.message)}
		<Alert tone={issue.level === 'error' ? 'danger' : 'warn'}>{issue.message}</Alert>
	{/each}
	{#if accountProblem && !locked}
		<Alert tone="warn">{accountProblem} Connect it on the Integrations page to publish.</Alert>
	{/if}
	{#if error}
		<Alert tone={status === 'failed' ? 'danger' : 'warn'}>{error}</Alert>
	{/if}
	{#if remoteUrl}
		<p><ExternalLink href={remoteUrl}>View the post on {platform.name}</ExternalLink></p>
	{/if}

	{#if !locked}
		<footer>
			<Button action="secondary" disabled={text === generated} onclick={() => (text = generated)}>
				Reset text
			</Button>
			<Button
				type="submit"
				formaction="?/publish"
				name="platform"
				value={platformId}
				disabled={!ready}
			>
				Publish to {platform.name}
			</Button>
		</footer>
	{/if}
</article>
