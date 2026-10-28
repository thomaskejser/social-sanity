<script lang="ts" module>
	const PATHS = {
		humans: [
			'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
			'M2 20a7 7 0 0 1 14 0',
			'M17 11.5a2.5 2.5 0 1 0 0-5',
			'M18 14a5 5 0 0 1 4 5'
		],
		tasks: ['M3 3h8v8H3z', 'M13 3h8v8h-8z', 'M3 13h8v8H3z', 'M13 13h8v8h-8z'],
		consume: [
			'M4 5h13v14H6a2 2 0 0 1-2-2z',
			'M17 9h3v8a2 2 0 0 1-2 2h-1',
			'M7 9h7',
			'M7 12.5h7',
			'M7 16h4'
		],
		contribute: ['M4 20l4-1L19 8l-3-3L5 16z', 'M14 7l3 3'],
		integrations: ['M9 3v5', 'M15 3v5', 'M6 8h12v3a6 6 0 0 1-12 0z', 'M12 17v4'],
		crown: ['M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z'],
		external: [
			'M14 4h6v6',
			'M20 4l-9 9',
			'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'
		],
		claude: [
			'M12 3v5',
			'M12 16v5',
			'M3 12h5',
			'M16 12h5',
			'M5.6 5.6l3 3',
			'M15.4 15.4l3 3',
			'M5.6 18.4l3-3',
			'M15.4 8.6l3-3'
		],
		check: ['M4 12.5l5 5L20 6.5'],
		calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
		company: [
			'M4 21V5l8-3v19',
			'M12 21V9l8 3v9',
			'M2 21h20',
			'M7 8h2',
			'M7 12h2',
			'M7 16h2',
			'M15 15h2',
			'M15 18h2'
		],
		channel: ['M3 6h18v13H3z', 'M8 2l4 4 4-4', 'M10 10v6l5-3z'],
		merge: ['M5 3l7 8', 'M19 3l-7 8', 'M12 11v10', 'M8 17l4 4 4-4'],
		play: ['M8 5v14l11-7z'],
		rename: ['M4 20l4-1L19 8l-3-3L5 16z', 'M14 7l3 3'],
		trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
		human: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 21a7.5 7.5 0 0 1 15 0'],
		blog: ['M4 4h16v16H4z', 'M4 9h16', 'M8 13h8', 'M8 16.5h5'],
		settings: [
			'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
			'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'
		],
		repository: [
			'M6 3v12',
			'M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
			'M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
			'M18 9a9 9 0 0 1-9 9'
		]
	} as const;

	export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
	let { name, label }: { name: IconName; label?: string } = $props();
</script>

<svg
	class="icon"
	data-icon={name}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-hidden={label ? undefined : 'true'}
>
	{#if label}<title>{label}</title>{/if}
	{#each PATHS[name] as d (d)}
		<path {d} />
	{/each}
</svg>
