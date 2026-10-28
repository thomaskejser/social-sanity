<script lang="ts" module>
	export type HumanFormView = {
		human: string;
		firstName: string;
		middleNames: string[];
		familyName: string;
		birthday: string;
	};
	export type HumanFormErrors = Partial<Record<'human' | 'firstName' | 'birthday', string>>;
</script>

<script lang="ts">
	import Button from './Button.svelte';
	import DateField from './DateField.svelte';
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';

	let {
		human,
		errors,
		fromGoogle
	}: { human: HumanFormView; errors: HumanFormErrors | null; fromGoogle: boolean } = $props();
</script>

<Form action="?/save" label="Names" variant="settings" resetOnSuccess={false}>
	<TextField
		label="Display name"
		name="human"
		value={human.human}
		error={errors?.human}
		hint="How the human is shown everywhere in the app."
		required
	/>
	<TextField
		label="First name"
		name="firstName"
		value={human.firstName}
		error={errors?.firstName}
	/>
	<TextField
		label="Middle names"
		name="middleNames"
		value={human.middleNames.join(' ')}
		hint="Separated by spaces."
	/>
	<TextField label="Family name" name="familyName" value={human.familyName} />
	<DateField
		label="Birthday"
		name="birthday"
		value={human.birthday}
		error={errors?.birthday}
		allowNoYear
	/>
	<footer>
		<Button type="submit">Save</Button>
	</footer>
	{#if fromGoogle}
		<p class="card-note">
			This human came from Google Contacts. The hourly import only adds new contacts, so changes
			made here are kept.
		</p>
	{/if}
</Form>
