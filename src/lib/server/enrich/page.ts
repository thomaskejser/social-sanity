import { fail, redirect, type Action, type ServerLoad } from '@sveltejs/kit';
import { getChannel } from '../channels/store.ts';
import { claudeReady } from '../claude.ts';
import { getCompany } from '../companies/store.ts';
import { idField } from '../humans/form.ts';
import { deleteHuman, getHuman } from '../humans/store.ts';
import { convertMember } from '../members/convert.ts';
import {
	autoEnrichState,
	decidePause,
	isAutoEnriching,
	startAutoEnrich,
	stopAutoEnrich
} from './auto.ts';
import { applyEnrichment, enrichErrorMessage, enrichMember } from './index.ts';
import { nextToEnrich } from './walk.ts';
import { isMemberKind, type MemberKind } from '#lib/groups/member.ts';

function nameOf(kind: MemberKind, id: number): string | undefined {
	if (kind === 'human') return getHuman(id)?.human;
	if (kind === 'company') return getCompany(id)?.company;
	return getChannel(id)?.channel;
}

/** The record named by the form's `memberId`, or undefined when there is no such record. */
function member(kind: MemberKind, form: FormData): { id: number; name: string } | undefined {
	const id = idField(form, 'memberId');
	if (!id) return undefined;
	const name = nameOf(kind, id);
	return name === undefined ? undefined : { id, name };
}

/** The kind a form's `to` asks to move a record of `kind` to; undefined when it is not another kind. */
function targetKind(kind: MemberKind, form: FormData): MemberKind | undefined {
	const to = form.get('to');
	return isMemberKind(to) && to !== kind ? to : undefined;
}

/** The record a move made, named in the URL as `converted=<kind>:<id>`; null when none was. */
function converted(url: URL): { kind: MemberKind; id: number; name: string } | null {
	const [kind, id] = (url.searchParams.get('converted') ?? '').split(':');
	const name = isMemberKind(kind) ? nameOf(kind, Number(id)) : undefined;
	return isMemberKind(kind) && name !== undefined ? { kind, id: Number(id), name } : null;
}

function after(url: URL): number {
	const value = Number(url.searchParams.get('after'));
	return Number.isInteger(value) && value > 0 ? value : 0;
}

/**
 * The Enrich page of a kind: the next record, after the `after` ID in the URL, that Claude has not
 * looked up yet. With `auto` in the URL the page starts the lookup by itself. While the automatic
 * run is going on, the page is its Auto page instead.
 */
export function enrichLoad(kind: MemberKind): ServerLoad {
	return ({ url }) => {
		if (isAutoEnriching(kind)) redirect(303, `${url.pathname}/auto`);
		return {
			kind,
			candidate: nextToEnrich(kind, after(url)) ?? null,
			auto: url.searchParams.has('auto'),
			converted: converted(url),
			claudeConfigured: claudeReady()
		};
	};
}

/**
 * Looking the current record up, which marks it, saving what the user ticked, deleting a human
 * the AI found no name for, and moving a record the AI thinks is another kind.
 */
export function enrichActions(kind: MemberKind): Record<string, Action> {
	return {
		lookup: async ({ request }) => {
			const record = member(kind, await request.formData());
			if (!record) return fail(400, { lookup: { error: `That ${kind} no longer exists.` } });
			try {
				return { lookup: { ...record, enrichment: await enrichMember(kind, record.id) } };
			} catch (error) {
				return fail(502, {
					lookup: { error: `The lookup of ${record.name} failed: ${enrichErrorMessage(error)}` }
				});
			}
		},

		apply: async ({ request, url }) => {
			const form = await request.formData();
			const record = member(kind, form);
			if (!record) return fail(400, { lookup: { error: `That ${kind} no longer exists.` } });
			const error = await applyEnrichment(kind, record.id, form);
			if (error)
				return fail(400, {
					lookup: { error: `Could not save what you chose for ${record.name}: ${error}` }
				});
			redirect(303, `${url.pathname}?after=${record.id}&auto`);
		},

		delete: async ({ request, url }) => {
			const record = member(kind, await request.formData());
			if (!record || kind !== 'human')
				return fail(400, { lookup: { error: `That ${kind} no longer exists.` } });
			deleteHuman(record.id);
			redirect(303, `${url.pathname}?after=${record.id}&auto`);
		},

		convert: async ({ request, url }) => {
			const form = await request.formData();
			const record = member(kind, form);
			const to = targetKind(kind, form);
			if (!record || !to) return fail(400, { lookup: { error: `That ${kind} no longer exists.` } });
			const newId = convertMember(kind, record.id, to);
			redirect(303, `${url.pathname}?after=${record.id}&auto&converted=${to}:${newId}`);
		},

		auto: async ({ url }) => {
			if (!claudeReady()) return fail(400, { lookup: { error: 'Set up AI under Integrations.' } });
			// The run outlives the request; its errors show on the Auto page.
			startAutoEnrich(kind).catch(() => {});
			redirect(303, `${url.pathname}/auto`);
		}
	};
}

/** The Auto page of a kind: what the automatic run has saved so far, and how many are left. */
export function autoEnrichLoad(kind: MemberKind): ServerLoad {
	return () => ({
		kind,
		run: autoEnrichState(kind),
		remaining: nextToEnrich(kind, 0)?.remaining ?? 0
	});
}

/**
 * Stopping the run, which goes back to the one-at-a-time walk after the record it was on, and
 * settling a record it stopped at because the AI thinks it is another kind.
 */
export function autoEnrichActions(kind: MemberKind): Record<string, Action> {
	const decided = (done: boolean) =>
		done ? undefined : fail(400, { error: 'The run is not waiting on that record any more.' });
	return {
		convert: async ({ request }) => {
			const form = await request.formData();
			const id = idField(form, 'memberId');
			const to = targetKind(kind, form);
			if (!id || !to) return fail(400, { error: 'Choose what to make it.' });
			return decided(await decidePause(kind, id, { to }));
		},

		keep: async ({ request }) => {
			const id = idField(await request.formData(), 'memberId');
			if (!id) return fail(400, { error: 'Unknown record.' });
			return decided(await decidePause(kind, id, 'keep'));
		},

		stop: async ({ url }) => {
			const current = stopAutoEnrich(kind);
			const walk = url.pathname.replace(/\/auto$/, '');
			redirect(303, current ? `${walk}?after=${current.id}` : walk);
		}
	};
}
