import type { Tone } from '../tone.ts';

export type TargetStatus = 'draft' | 'publishing' | 'published' | 'failed';

export function targetStatus(
	status: TargetStatus,
	accountProblem: string | null,
	hasErrors: boolean
): { tone: Tone; label: string } {
	if (status === 'published') return { tone: 'ok', label: 'Published' };
	if (status === 'publishing') return { tone: 'info', label: 'Publishing…' };
	if (status === 'failed') return { tone: 'danger', label: 'Failed' };
	if (accountProblem) return { tone: 'neutral', label: 'Not connected' };
	if (hasErrors) return { tone: 'warn', label: 'Needs changes' };
	return { tone: 'info', label: 'Ready' };
}

export function statusLabel(status: TargetStatus): { tone: Tone; label: string } {
	if (status === 'draft') return { tone: 'neutral', label: 'Draft' };
	return targetStatus(status, null, false);
}
