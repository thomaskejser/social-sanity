/** Copies text to the clipboard and remembers what was copied for a moment, so the page can
 * show "Copied" next to it. */
export class Clipboard {
	copied = $state<string | null>(null);
	#timer: ReturnType<typeof setTimeout> | undefined;
	#resetMs: number;

	constructor(resetMs = 2000) {
		this.#resetMs = resetMs;
	}

	async copy(text: string) {
		await navigator.clipboard.writeText(text);
		this.copied = text;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => (this.copied = null), this.#resetMs);
	}
}
