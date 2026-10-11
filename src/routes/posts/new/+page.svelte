<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import FileField from '#lib/components/FileField.svelte';
	import Form from '#lib/components/Form.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TextArea from '#lib/components/TextArea.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { MAX_MEDIA_BYTES, MAX_MEDIA_FILES, MEDIA_ACCEPT } from '#lib/media.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>New post · Social Sanity</title>
</svelte:head>

<PageHeader title="New post">
	{#snippet lede()}
		Write the post once and add images or a video. It is saved as a Markdown file in the posts
		repository; the next page shows how it will look on each platform.
	{/snippet}
</PageHeader>

{#if !data.repoConfigured}
	<Alert tone="warn">Add a posts repository on the Integrations page before writing posts.</Alert>
{/if}
{#if form?.errors?.form}
	<Alert tone="danger">{form.errors.form}</Alert>
{/if}

<Form label="New post" variant="compose" enctype="multipart/form-data" resetOnSuccess={false}>
	<TextField
		label="Title (optional)"
		name="title"
		value={form?.title ?? ''}
		hint="Used for the folder name and front matter; not posted."
		error={form?.errors?.title}
	/>
	<TextArea
		label="Text"
		name="text"
		value={form?.text ?? ''}
		rows={10}
		placeholder="What do you want to share? Markdown, #hashtags and links are fine."
		error={form?.errors?.text}
	/>
	<FileField
		label="Images and videos"
		name="media"
		accept={MEDIA_ACCEPT}
		multiple
		hint="JPEG, PNG, GIF, MP4 or MOV; up to {MAX_MEDIA_FILES} files of {MAX_MEDIA_BYTES /
			1024 /
			1024} MB each. Instagram needs JPEG images. Files are committed to the repository; GitHub rejects files over 100 MB."
		error={form?.errors?.media}
	/>
	<footer>
		<Button type="submit" disabled={!data.repoConfigured}>Save and preview</Button>
	</footer>
</Form>
