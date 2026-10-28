import { SOCIAL_SANITY_PUBLIC_BASE_URL } from '$app/env/private';

export function redirectUriFor(platform: string, requestOrigin: string): string {
	return `${SOCIAL_SANITY_PUBLIC_BASE_URL ?? requestOrigin}/integrations/${platform}/callback`;
}
