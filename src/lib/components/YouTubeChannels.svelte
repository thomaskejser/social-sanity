<script lang="ts" module>
	export type ChannelRow = {
		youtubeChannelId: number;
		channelId: string;
		youtubeChannel: string;
		thumbnailUrl: string;
		suggestionReason: string;
		addedAt: number | null;
		humanId: number | null;
		human: string | null;
		companyId: number | null;
		company: string | null;
		appChannelId: number | null;
		appChannel: string | null;
	};
</script>

<script lang="ts">
	import type { Page } from '#lib/pagination.ts';
	import { channelUrl } from '#lib/youtube/classify.ts';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import Form from './Form.svelte';
	import MemberLink from './MemberLink.svelte';
	import PaginatedTable from './PaginatedTable.svelte';

	/** The imported subscriptions, and what each became in the app. */
	let {
		channels,
		counts,
		pages,
		href,
		connected,
		claudeConfigured,
		sorting,
		message
	}: {
		channels: ChannelRow[];
		counts: { imported: number; waiting: number; added: number };
		pages: Page;
		href: (n: number) => string;
		connected: boolean;
		claudeConfigured: boolean;
		sorting: { running: boolean; error: string | null };
		message: { tone: 'ok' | 'danger'; message: string } | null;
	} = $props();
</script>

<section class="youtube-channels" aria-labelledby="subscriptions">
	<h2 id="subscriptions">Subscriptions</h2>
	<p class="card-note">
		The channels you subscribe to are imported every hour. In the background, AI decides whether
		each new one is a human, a company or a channel and adds it: a human or company gets the channel
		as a YouTube account and its videos as a content source, a channel goes under Channels. After
		that the app decides what it is; change it there, and imports leave it alone.
	</p>
	{#if message}
		<Alert tone={message.tone}>{message.message}</Alert>
	{/if}
	{#if !connected}
		<Alert tone="info">Connect YouTube above first.</Alert>
	{:else}
		{#if !claudeConfigured && counts.waiting}
			<Alert tone="info">
				Set up AI under Integrations to have the channels sorted and added; until then they wait
				here.
			</Alert>
		{:else if sorting.running}
			<Alert tone="info">
				AI is sorting the new channels in the background. Reload the page to see them added.
			</Alert>
		{:else if sorting.error}
			<Alert tone="danger">
				Sorting stopped: {sorting.error} It tries again within 15 minutes.
			</Alert>
		{/if}
		<Form action="?/importSubscriptions" label="Import YouTube subscriptions">
			<footer>
				<Button type="submit" action="secondary" busyLabel="Importing subscriptions…">
					Import now
				</Button>
			</footer>
		</Form>
		<p class="card-note">
			{counts.imported.toLocaleString()} imported, {counts.added.toLocaleString()} added, {counts.waiting.toLocaleString()}
			waiting.
		</p>
	{/if}
	{#if channels.length}
		<PaginatedTable
			caption="Imported channels"
			columns={['Channel', 'In the app']}
			rows={channels}
			{pages}
			{href}
		>
			{#snippet row(channel)}
				<td class="channel-cell">
					{#if channel.thumbnailUrl}
						<img src={channel.thumbnailUrl} alt="" width="36" height="36" loading="lazy" />
					{/if}
					<div>
						<ExternalLink href={channelUrl(channel.channelId)}
							>{channel.youtubeChannel}</ExternalLink
						>
						{#if channel.suggestionReason}<small>{channel.suggestionReason}</small>{/if}
					</div>
				</td>
				<td>
					{#if channel.humanId !== null}
						<MemberLink kind="human" id={channel.humanId} name={channel.human ?? ''} />
					{:else if channel.companyId !== null}
						<MemberLink kind="company" id={channel.companyId} name={channel.company ?? ''} />
					{:else if channel.appChannelId !== null}
						<MemberLink kind="channel" id={channel.appChannelId} name={channel.appChannel ?? ''} />
					{:else if channel.addedAt !== null}
						Removed from the app
					{:else}
						Waiting for AI
					{/if}
				</td>
			{/snippet}
			{#snippet empty()}Nothing imported yet.{/snippet}
		</PaginatedTable>
	{/if}
</section>
