import type { Tone } from '../tone.ts';

export type IntegrationStatus = {
	tone: Tone;
	label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_WARNING_DAYS = 7;

export function integrationStatus(
	configured: boolean,
	account: { expiresAt: number | null } | null,
	now = Date.now()
): IntegrationStatus {
	if (!configured) return { tone: 'neutral', label: 'Not configured' };
	if (!account) return { tone: 'neutral', label: 'Not connected' };
	if (account.expiresAt === null) return { tone: 'ok', label: 'Connected' };

	const msLeft = account.expiresAt - now;
	if (msLeft <= 0) return { tone: 'danger', label: 'Expired — reconnect' };

	const daysLeft = Math.ceil(msLeft / DAY_MS);
	if (daysLeft <= EXPIRY_WARNING_DAYS) {
		return { tone: 'warn', label: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` };
	}
	return { tone: 'ok', label: 'Connected' };
}
