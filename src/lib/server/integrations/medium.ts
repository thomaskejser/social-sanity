const API = 'https://api.medium.com/v1';
const TIMEOUT_MS = 15_000;

export type MediumUser = { id: string; username: string; name: string; url: string };

export class MediumError extends Error {}

/** The user an integration token belongs to, from `GET /v1/me`. Throws MediumError with a
 * message fit to show the user. */
export async function fetchMediumUser(
	token: string,
	fetchFn: typeof fetch = fetch
): Promise<MediumUser> {
	let response: Response;
	try {
		response = await fetchFn(`${API}/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				'Accept-Charset': 'utf-8'
			},
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (error) {
		throw new MediumError(
			`Could not reach Medium: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (response.status === 401)
		throw new MediumError('Medium rejected the token. It may have been revoked.');
	if (!response.ok)
		throw new MediumError(`Medium answered ${response.status} ${response.statusText}.`);
	const body = (await response.json().catch(() => null)) as { data?: Partial<MediumUser> } | null;
	const user = body?.data;
	if (!user?.id || !user.username)
		throw new MediumError('Medium answered without the user the token belongs to.');
	return { id: user.id, username: user.username, name: user.name ?? '', url: user.url ?? '' };
}
