import { fail, type Action, type ServerLoad } from '@sveltejs/kit';
import { claudeErrorMessage, claudeReady } from '../claude.ts';
import { idField } from '../humans/form.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import { mergeMembers } from './convert.ts';
import { findDuplicates, pendingCandidates, setCandidateStatus } from './duplicates.ts';

/** The Auto Merge page of a kind: the next pair to decide on, and how many are left. */
export function autoMergeLoad(kind: MemberKind): ServerLoad {
	return () => {
		const pending = pendingCandidates(kind);
		return {
			kind,
			claudeConfigured: claudeReady(),
			current: pending[0] ?? null,
			left: pending.length
		};
	};
}

/**
 * Finding pairs with AI, and the user's decision on one pair. Merging only ever happens here,
 * when the user chooses which record to keep.
 */
export function autoMergeActions(kind: MemberKind): Record<string, Action> {
	function candidate(form: FormData) {
		const id = idField(form, 'mergeCandidateId');
		return pendingCandidates(kind).find((c) => c.mergeCandidateId === id);
	}

	return {
		find: async () => {
			try {
				return { found: await findDuplicates(kind) };
			} catch (error) {
				return fail(502, { error: claudeErrorMessage(error) });
			}
		},

		merge: async ({ request }) => {
			const form = await request.formData();
			const pair = candidate(form);
			const keep = idField(form, 'keepId');
			if (!pair || (keep !== pair.first.id && keep !== pair.second.id))
				return fail(400, { error: 'That pair was already decided.' });
			const drop = keep === pair.first.id ? pair.second : pair.first;
			mergeMembers(kind, drop.id, keep);
			setCandidateStatus(pair.mergeCandidateId, 'MERGED');
			return { merged: { kept: keep === pair.first.id ? pair.first.name : pair.second.name } };
		},

		dismiss: async ({ request }) => {
			const pair = candidate(await request.formData());
			if (!pair) return fail(400, { error: 'That pair was already decided.' });
			setCandidateStatus(pair.mergeCandidateId, 'DISMISSED');
			return { dismissed: true };
		}
	};
}
