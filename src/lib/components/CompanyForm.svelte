<script lang="ts" module>
	export type CompanyFormView = { company: string; website: string; notes: string };
	export type CompanyFormErrors = Partial<Record<'company' | 'website', string>>;
</script>

<script lang="ts">
	import Button from './Button.svelte';
	import Form from './Form.svelte';
	import TextArea from './TextArea.svelte';
	import TextField from './TextField.svelte';

	let {
		company,
		errors,
		action,
		submitLabel
	}: {
		company: CompanyFormView;
		errors: CompanyFormErrors | null;
		action?: string;
		submitLabel: string;
	} = $props();
</script>

<Form {action} label="Company" variant="settings" resetOnSuccess={false}>
	<TextField label="Name" name="company" value={company.company} error={errors?.company} required />
	<TextField
		label="Website"
		name="website"
		type="url"
		value={company.website}
		error={errors?.website}
		placeholder="https://example.com"
	/>
	<TextArea label="Notes" name="notes" value={company.notes} rows={3} />
	<footer>
		<Button type="submit">{submitLabel}</Button>
	</footer>
</Form>
