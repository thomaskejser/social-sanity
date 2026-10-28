import { describeDay } from '#lib/humans/details.ts';
import type { Enrichment } from '#lib/humans/enrich.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import { convertMember } from '../members/convert.ts';
import { applyEnrichment, enrichErrorMessage, enrichMember } from './index.ts';
import { nextToEnrich } from './walk.ts';

/** One record the automatic run looked up, and what it saved. */
export type AutoEntry = {
	id: number;
	name: string;
	/** What was saved, e.g. "Birthday: 3 February 1980"; empty when nothing confident was found. */
	added: string[];
	error: string;
};

export type AutoState = {
	running: boolean;
	/** The record being looked up now; null when none is. */
	current: { id: number; name: string } | null;
	/** The last few looked up, newest first. */
	entries: AutoEntry[];
	/** How many records the run looked up, and for how many it saved something. */
	looked: number;
	saved: number;
	/** Why the run ended early; null when it did not. */
	error: string | null;
	/**
	 * The record the run stopped at because the AI thinks it is another kind, until the user
	 * decides; null when the run is not waiting.
	 */
	paused: { id: number; name: string; enrichment: Enrichment } | null;
};

const SHOWN_ENTRIES = 10;

const ARTICLE_NOUN = { human: 'a human', company: 'a company', channel: 'a channel' };

/** The run gives up after this many lookups in a row fail, e.g. when the AI is unreachable. */
const MAX_FAILURES_IN_A_ROW = 3;

type Run = AutoState & { stop: boolean; promise: Promise<void> | null };

const idle = (): Run => ({
	running: false,
	current: null,
	entries: [],
	looked: 0,
	saved: 0,
	error: null,
	paused: null,
	stop: false,
	promise: null
});

const runs: Record<MemberKind, Run> = { human: idle(), company: idle(), channel: idle() };

/**
 * The findings of high confidence, as the form the user would tick on the Enrich page, and how
 * each reads to the user.
 */
export function highConfidence(enrichment: Enrichment): { form: FormData; added: string[] } {
	const form = new FormData();
	const added: string[] = [];
	const typed = (type: string) => (type ? ` (${type})` : '');
	const { name, birthday } = enrichment;
	if (name?.confidence === 'high') {
		form.append('name', `${name.firstName}|${name.familyName}`);
		added.push(`Name: ${[name.firstName, name.familyName].filter(Boolean).join(' ')}`);
	}
	if (birthday?.confidence === 'high') {
		form.append('birthday', birthday.value);
		added.push(`Birthday: ${describeDay(birthday.value)}`);
	}
	for (const place of enrichment.places.filter((p) => p.confidence === 'high')) {
		form.append('place', `${place.type}|${place.address}`);
		added.push(`Place${typed(place.type)}: ${place.address}`);
	}
	for (const phone of enrichment.phones.filter((p) => p.confidence === 'high')) {
		form.append('phone', `${phone.type}|${phone.value}`);
		added.push(`Phone${typed(phone.type)}: ${phone.value}`);
	}
	for (const account of enrichment.socialAccounts.filter((a) => a.confidence === 'high')) {
		form.append('social', account.url);
		added.push(`Social media: ${account.url}`);
	}
	for (const picture of enrichment.pictures.filter((p) => p.confidence === 'high')) {
		form.append('picture', picture.url);
		added.push(`Picture: ${picture.url}`);
	}
	for (const source of enrichment.sources.filter((s) => s.confidence === 'high')) {
		form.append('uri', source.uri);
		added.push(`Content source: ${source.uri}`);
	}
	return { form, added };
}

async function save(
	kind: MemberKind,
	record: { id: number; name: string },
	enrichment: Enrichment
): Promise<AutoEntry> {
	const { form, added } = highConfidence(enrichment);
	const error = added.length ? await applyEnrichment(kind, record.id, form) : undefined;
	return error
		? { ...record, added: [], error: `Could not save: ${error}` }
		: { ...record, added, error: '' };
}

/** The record's entry for the log, or its findings when the AI thinks it is another kind. */
async function lookUp(
	kind: MemberKind,
	record: { id: number; name: string }
): Promise<AutoEntry | Enrichment> {
	try {
		const enrichment = await enrichMember(kind, record.id);
		return enrichment.kind ? enrichment : await save(kind, record, enrichment);
	} catch (error) {
		return { ...record, added: [], error: enrichErrorMessage(error) };
	}
}

function log(run: Run, entry: AutoEntry) {
	run.entries = [entry, ...run.entries].slice(0, SHOWN_ENTRIES);
	run.looked++;
	if (entry.added.length) run.saved++;
}

async function walk(kind: MemberKind, run: Run) {
	let after = 0;
	let failures = 0;
	while (!run.stop) {
		const candidate = nextToEnrich(kind, after);
		if (!candidate) break;
		after = candidate.id;
		run.current = { id: candidate.id, name: candidate.name };
		const entry = await lookUp(kind, run.current);
		if (!('added' in entry)) {
			run.paused = { ...run.current, enrichment: entry };
			break;
		}
		log(run, entry);
		failures = entry.error ? failures + 1 : 0;
		if (failures >= MAX_FAILURES_IN_A_ROW) {
			run.error = `Stopped after ${failures} failed lookups in a row: ${entry.error}`;
			break;
		}
	}
}

/**
 * Looks up, one after another, every record of `kind` the Enrich walk would offer, saving only
 * what the AI is highly confident about. Nothing is ever deleted or merged. When the AI thinks a
 * record is another kind, the run stops there until the user decides (see `decidePause`). A call
 * while a run is going on joins it; a new run starts with an empty log.
 */
export function startAutoEnrich(kind: MemberKind): Promise<void> {
	const existing = runs[kind];
	if (existing.promise) return existing.promise;
	runs[kind] = idle();
	return walkOn(kind);
}

function walkOn(kind: MemberKind): Promise<void> {
	const run = runs[kind];
	run.stop = false;
	run.error = null;
	run.running = true;
	run.promise = walk(kind, run).finally(() => {
		run.running = false;
		run.current = null;
		run.promise = null;
	});
	return run.promise;
}

/**
 * Asks the run to stop after the lookup in progress, or ends the wait on a record the user has not
 * decided on. Returns that record, so the one-at-a-time walk can carry on after it.
 */
export function stopAutoEnrich(kind: MemberKind): { id: number; name: string } | null {
	const run = runs[kind];
	run.stop = true;
	const paused = run.paused && { id: run.paused.id, name: run.paused.name };
	run.paused = null;
	return run.current ?? paused;
}

/** Whether a run is going on that has not been asked to stop, or is waiting on the user. */
export function isAutoEnriching(kind: MemberKind): boolean {
	return (runs[kind].running && !runs[kind].stop) || runs[kind].paused !== null;
}

export function autoEnrichState(kind: MemberKind): AutoState {
	const { running, current, entries, looked, saved, error, paused } = runs[kind];
	return { running, current, entries: [...entries], looked, saved, error, paused };
}

/**
 * Settles the record the run stopped at: moves it to the kind `to`, or with `keep` saves what the
 * AI is highly confident about as for any other record. The run then carries on with the next
 * record, keeping its log. Returns false when the run is not waiting on that record.
 */
export async function decidePause(
	kind: MemberKind,
	id: number,
	decision: { to: MemberKind } | 'keep'
): Promise<boolean> {
	const run = runs[kind];
	const paused = run.paused;
	if (!paused || paused.id !== id || run.promise) return false;
	run.paused = null;
	const record = { id: paused.id, name: paused.name };
	if (decision === 'keep') {
		log(run, await save(kind, record, paused.enrichment));
	} else {
		convertMember(kind, id, decision.to);
		log(run, { ...record, added: [`Made it ${ARTICLE_NOUN[decision.to]}`], error: '' });
	}
	walkOn(kind).catch(() => {});
	return true;
}
