<script lang="ts">
	import type { Enrichment } from '#lib/humans/enrich.ts';
	import { describeDay } from '#lib/humans/details.ts';
	import { accountHandle } from '#lib/social-accounts.ts';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Checkbox from './Checkbox.svelte';
	import Form from './Form.svelte';

	/**
	 * The AI's findings as a form of ticked suggestions, highlighted as new. Submits `name`
	 * (`first|family`), `birthday`,
	 * `place` (`type|address`), `phone` (`type|number`), `social`, `uri` and `picture` to `action`.
	 */
	let {
		enrichment,
		action = '?/applyEnrichment',
		submitLabel = 'Add selected',
		onsuccess,
		fields = {},
		footer
	}: {
		enrichment: Enrichment;
		action?: string;
		submitLabel?: string;
		onsuccess?: () => void;
		/** Hidden fields sent with the form, e.g. which human it is for. */
		fields?: Record<string, string | number>;
		/** Extra buttons next to the submit button. */
		footer?: import('svelte').Snippet;
	} = $props();

	const TONES = { high: 'ok', medium: 'info', low: 'neutral' } as const;
</script>

<Form {action} label="Review findings" variant="findings" {onsuccess}>
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	{#if enrichment.identity}
		<p><strong>The AI thinks this is:</strong> {enrichment.identity}</p>
	{/if}
	{#if enrichment.name}
		<fieldset>
			<legend>Name</legend>
			<Checkbox
				label="{enrichment.name.firstName} {enrichment.name.familyName}"
				name="name"
				value="{enrichment.name.firstName}|{enrichment.name.familyName}"
				checked={enrichment.name.confidence === 'high'}
				description={enrichment.name.reason}
			>
				{#snippet badge()}<Badge tone={TONES[enrichment.name!.confidence]}
						>{enrichment.name!.confidence}</Badge
					>{/snippet}
			</Checkbox>
		</fieldset>
	{/if}
	{#if enrichment.birthday}
		<fieldset>
			<legend>Birthday</legend>
			<Checkbox
				label={describeDay(enrichment.birthday.value)}
				name="birthday"
				value={enrichment.birthday.value}
				checked={enrichment.birthday.confidence === 'high'}
				description={enrichment.birthday.reason}
			>
				{#snippet badge()}<Badge tone={TONES[enrichment.birthday!.confidence]}
						>{enrichment.birthday!.confidence}</Badge
					>{/snippet}
			</Checkbox>
		</fieldset>
	{/if}
	{#if enrichment.pictures.length}
		<fieldset>
			<legend>Pictures</legend>
			{#each enrichment.pictures as picture (picture.url)}
				<Checkbox
					label={new URL(picture.url).hostname}
					name="picture"
					value={picture.url}
					picture={picture.url}
					checked={picture.confidence === 'high'}
					description={picture.reason}
				>
					{#snippet badge()}<Badge tone={TONES[picture.confidence]}>{picture.confidence}</Badge
						>{/snippet}
				</Checkbox>
			{/each}
		</fieldset>
	{/if}
	{#if enrichment.socialAccounts.length}
		<fieldset>
			<legend>Social media</legend>
			{#each enrichment.socialAccounts as account (account.url)}
				<Checkbox
					label="{account.platform}: {accountHandle(account.url)}"
					name="social"
					value={account.url}
					checked={account.confidence === 'high'}
					description="{account.url} — {account.reason}"
				>
					{#snippet badge()}<Badge tone={TONES[account.confidence]}>{account.confidence}</Badge
						>{/snippet}
				</Checkbox>
			{/each}
		</fieldset>
	{/if}
	{#if enrichment.places.length}
		<fieldset>
			<legend>Places</legend>
			{#each enrichment.places as place (place.address)}
				<Checkbox
					label="{place.type ? `${place.type}: ` : ''}{place.address}"
					name="place"
					value="{place.type}|{place.address}"
					checked={place.confidence === 'high'}
					description={place.reason}
				>
					{#snippet badge()}<Badge tone={TONES[place.confidence]}>{place.confidence}</Badge
						>{/snippet}
				</Checkbox>
			{/each}
		</fieldset>
	{/if}
	{#if enrichment.phones.length}
		<fieldset>
			<legend>Phone numbers</legend>
			{#each enrichment.phones as phone (phone.value)}
				<Checkbox
					label="{phone.type ? `${phone.type}: ` : ''}{phone.value}"
					name="phone"
					value="{phone.type}|{phone.value}"
					checked={phone.confidence === 'high'}
					description={phone.original
						? `${phone.original} in Google Contacts — ${phone.reason}`
						: phone.reason}
				>
					{#snippet badge()}<Badge tone={TONES[phone.confidence]}>{phone.confidence}</Badge
						>{/snippet}
				</Checkbox>
			{/each}
		</fieldset>
	{/if}
	{#if enrichment.sources.length}
		<fieldset>
			<legend>Content sources</legend>
			{#each enrichment.sources as source (source.uri)}
				<Checkbox
					label={source.uri}
					name="uri"
					value={source.uri}
					checked={source.confidence === 'high'}
					description={source.reason}
				>
					{#snippet badge()}<Badge tone={TONES[source.confidence]}>{source.confidence}</Badge
						>{/snippet}
				</Checkbox>
			{/each}
		</fieldset>
	{/if}
	<footer>
		<Button type="submit">{submitLabel}</Button>
		{#if footer}{@render footer()}{/if}
	</footer>
</Form>
