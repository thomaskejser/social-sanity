<script lang="ts">
	import type { MemberKind } from '#lib/groups/member.ts';
	import Alert from './Alert.svelte';
	import MemberLink from './MemberLink.svelte';

	/** Says what a human, company or channel was turned into, with a link to it. */
	let { converted }: { converted: { kind: MemberKind; id: number; name: string } } = $props();

	const NOUN = { human: 'a human', company: 'a company', channel: 'a channel' };
</script>

<Alert tone="ok">
	Turned into {NOUN[converted.kind]}:
	<MemberLink kind={converted.kind} id={converted.id} name={converted.name} />
</Alert>
