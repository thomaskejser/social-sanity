<script lang="ts">
	import { resolve } from '$app/paths';
	import type { MemberKind } from '#lib/groups/member.ts';
	import Icon from './Icon.svelte';

	/** A human, company or channel, with its picture, or an icon saying which. */
	let {
		kind,
		id,
		name,
		avatar = false
	}: { kind: MemberKind; id: number; name: string; avatar?: boolean } = $props();

	const LABELS = { human: 'Human', company: 'Company', channel: 'Channel' };

	const href = $derived(
		kind === 'human'
			? resolve('/humans/[id]', { id: String(id) })
			: kind === 'company'
				? resolve('/companies/[id]', { id: String(id) })
				: resolve('/channels/[id]', { id: String(id) })
	);
</script>

<a class="member-link" {href}
	>{#if avatar}<img
			class="member-avatar"
			src="/avatars/{kind}/{id}"
			alt={LABELS[kind]}
			loading="lazy"
		/>{:else}<Icon name={kind} label={LABELS[kind]} />{/if}{name}</a
>
