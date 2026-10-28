<script lang="ts" module>
	export type ChannelFormView = { channel: string; website: string; notes: string };
	export type ChannelFormErrors = Partial<Record<'channel' | 'website', string>>;
</script>

<script lang="ts">
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import TextArea from './TextArea.svelte';
	import TextField from './TextField.svelte';

	let {
		channel,
		errors,
		action,
		submitLabel
	}: {
		channel: ChannelFormView;
		errors: ChannelFormErrors | null;
		action?: string;
		submitLabel: string;
	} = $props();
</script>

<Form {action} label="Channel" variant="settings" resetOnSuccess={false}>
	<TextField label="Name" name="channel" value={channel.channel} error={errors?.channel} required />
	<TextField
		label="Website"
		name="website"
		type="url"
		value={channel.website}
		error={errors?.website}
		placeholder="https://example.com"
	/>
	<TextArea label="Notes" name="notes" value={channel.notes} rows={3} />
	<footer>
		<Button type="submit">{submitLabel}</Button>
	</footer>
</Form>
