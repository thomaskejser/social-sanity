<script lang="ts">
	import { tick } from 'svelte';
	import { describeDay } from '#lib/humans/details.ts';
	import { YEARLESS, dayParts, daysInMonth, formatDayParts, monthGrid } from '#lib/dates.ts';
	import Icon from './Icon.svelte';

	/**
	 * A date field with a calendar. The form receives `YYYY-MM-DD`, or `--MM-DD` when
	 * `allowNoYear` is set and the year is marked unknown, or '' when empty.
	 */
	let {
		label,
		name,
		value = '',
		allowNoYear = false,
		hint,
		error,
		required = false
	}: {
		label: string;
		name: string;
		value?: string;
		allowNoYear?: boolean;
		hint?: string;
		error?: string;
		required?: boolean;
	} = $props();

	const id = $props.id();
	const today = new Date();

	// Writable deriveds: they start from `value` and follow it when it changes, while picks and
	// navigation in the calendar override them in between.
	let selected = $derived(value);
	let noYear = $derived(allowNoYear && dayParts(value)?.year === null);
	let viewYear = $derived(dayParts(value)?.year ?? today.getFullYear());
	let viewMonth = $derived(dayParts(value)?.month ?? today.getMonth() + 1);
	let open = $state(false);
	let grid: HTMLTableElement | undefined = $state();

	const parts = $derived(dayParts(selected));
	const shownYear = $derived(noYear ? YEARLESS : viewYear);
	const weeks = $derived(monthGrid(shownYear, viewMonth));
	/** The one day button reachable by Tab; arrow keys move between days. */
	const focusable = $derived(weeks.flat().find((day) => day !== null && isSelected(day)) ?? 1);
	const MONTHS = Array.from({ length: 12 }, (_, i) =>
		new Date(Date.UTC(YEARLESS, i, 1)).toLocaleString(undefined, { month: 'long', timeZone: 'UTC' })
	);
	const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
		new Date(Date.UTC(2024, 0, 1 + i)).toLocaleString(undefined, {
			weekday: 'short',
			timeZone: 'UTC'
		})
	);

	function isSelected(day: number): boolean {
		return (
			!!parts &&
			parts.day === day &&
			parts.month === viewMonth &&
			(noYear ? parts.year === null : parts.year === viewYear)
		);
	}

	function dayLabel(day: number): string {
		return describeDay(formatDayParts({ year: noYear ? null : viewYear, month: viewMonth, day }));
	}

	function pick(day: number) {
		selected = formatDayParts({ year: noYear ? null : viewYear, month: viewMonth, day });
		open = false;
	}

	function shiftMonth(by: number) {
		const index = viewYear * 12 + (viewMonth - 1) + by;
		if (!noYear) viewYear = Math.floor(index / 12);
		viewMonth = (((index % 12) + 12) % 12) + 1;
	}

	function setNoYear(unknown: boolean) {
		noYear = unknown;
		if (parts) selected = formatDayParts({ ...parts, year: unknown ? null : viewYear });
	}

	async function focusDay(day: number) {
		await tick();
		grid?.querySelector<HTMLButtonElement>(`button[data-day="${day}"]`)?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		const day = Number((event.target as HTMLElement).dataset.day);
		if (!day) return;
		const steps: Record<string, number> = {
			ArrowLeft: -1,
			ArrowRight: 1,
			ArrowUp: -7,
			ArrowDown: 7
		};
		if (event.key === 'Escape') {
			open = false;
			return;
		}
		if (event.key === 'PageUp' || event.key === 'PageDown') {
			event.preventDefault();
			shiftMonth(event.key === 'PageUp' ? -1 : 1);
			focusDay(Math.min(day, daysInMonth(shownYear, viewMonth)));
			return;
		}
		if (!(event.key in steps)) return;
		event.preventDefault();
		let next = day + steps[event.key];
		if (next < 1) {
			shiftMonth(-1);
			next += daysInMonth(shownYear, viewMonth);
		} else if (next > daysInMonth(shownYear, viewMonth)) {
			next -= daysInMonth(shownYear, viewMonth);
			shiftMonth(1);
		}
		focusDay(next);
	}

	async function toggle() {
		open = !open;
		if (open) focusDay(focusable);
	}
</script>

<div class="field date-field">
	<label for={id}>{label}</label>
	<div class="date-field-control">
		<button
			{id}
			type="button"
			aria-expanded={open}
			aria-controls="{id}-calendar"
			aria-describedby={error || hint ? `${id}-desc` : undefined}
			onclick={toggle}
		>
			<Icon name="calendar" />
			<span>{selected ? describeDay(selected) : 'Pick a date'}</span>
		</button>
		{#if selected && !required}
			<button type="button" data-action="inline" onclick={() => (selected = '')}>Clear</button>
		{/if}
	</div>
	<input type="hidden" {name} value={selected} />
	{#if open}
		<div class="calendar" id="{id}-calendar" role="group" aria-label="Choose {label}">
			<header>
				<button
					type="button"
					data-action="icon"
					aria-label="Previous month"
					onclick={() => shiftMonth(-1)}>‹</button
				>
				<select aria-label="Month" bind:value={viewMonth}>
					{#each MONTHS as month, i (month)}<option value={i + 1}>{month}</option>{/each}
				</select>
				{#if !noYear}
					<input type="number" aria-label="Year" bind:value={viewYear} min="1" max="9999" />
				{/if}
				<button
					type="button"
					data-action="icon"
					aria-label="Next month"
					onclick={() => shiftMonth(1)}>›</button
				>
			</header>
			{#if allowNoYear}
				<div class="choice">
					<input
						id="{id}-noyear"
						type="checkbox"
						checked={noYear}
						onchange={(event) => setNoYear(event.currentTarget.checked)}
					/>
					<label for="{id}-noyear">Year unknown</label>
				</div>
			{/if}
			<table
				bind:this={grid}
				role="grid"
				aria-label="{MONTHS[viewMonth - 1]} {noYear ? '' : viewYear}"
				{onkeydown}
			>
				{#if !noYear}
					<thead>
						<tr>
							{#each WEEKDAYS as weekday (weekday)}<th scope="col">{weekday}</th>{/each}
						</tr>
					</thead>
				{/if}
				<tbody>
					{#each weeks as week, w (w)}
						<tr>
							{#each week as day, d (d)}
								<td>
									{#if day}
										<button
											type="button"
											data-day={day}
											aria-label={dayLabel(day)}
											aria-pressed={isSelected(day)}
											tabindex={day === focusable ? 0 : -1}
											onclick={() => pick(day)}>{day}</button
										>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}
		<p class="field-error" id="{id}-desc">{error}</p>
	{:else if hint}
		<p class="field-hint" id="{id}-desc">{hint}</p>
	{/if}
</div>
