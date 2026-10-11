<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import FileField from '#lib/components/FileField.svelte';
	import Form from '#lib/components/Form.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TextArea from '#lib/components/TextArea.svelte';
	import { MAX_MEDIA_BYTES, MAX_MEDIA_FILES, MEDIA_ACCEPT } from '#lib/media.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>New post · Social Sanity</title>
</svelte:head>

<PageHeader title="New post">
	{#snippet lede()}
		Write the post once and add images or a video. The next page shows how it will look on each
		platform, where you can adjust the text before publishing.
	{/snippet}
</PageHeader>

<Form label="New post" variant="compose" enctype="multipart/form-data" resetOnSuccess={false}>
	<TextArea
		label="Text"
		name="text"
		value={form?.text ?? ''}
		rows={10}
		placeholder="What do you want to share? #hashtags and links are fine."
		error={form?.errors?.text}
	/>
	<FileField
		label="Images and videos"
		name="media"
		accept={MEDIA_ACCEPT}
		multiple
		hint="JPEG, PNG, GIF, MP4 or MOV; up to {MAX_MEDIA_FILES} files of {MAX_MEDIA_BYTES /
			1024 /
			1024} MB each. Instagram needs JPEG images."
		error={form?.errors?.media}
	/>
	<footer>
		<Button type="submit">Preview</Button>
	</footer>
</Form>
