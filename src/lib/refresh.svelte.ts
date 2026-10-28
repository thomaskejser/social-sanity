import { invalidateAll } from '$app/navigation';

/** Reloads the page's data every `intervalMs` while `active()` is true. Call from a page script. */
export function autoRefresh(active: () => boolean, intervalMs = 2000) {
	$effect(() => {
		if (!active()) return;
		const timer = setInterval(() => invalidateAll(), intervalMs);
		return () => clearInterval(timer);
	});
}
