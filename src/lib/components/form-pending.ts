import { getContext, setContext } from 'svelte';

/** The button that submitted the surrounding Form, while its action runs. */
export type FormPending = { submitter: HTMLElement | null };

const KEY = Symbol('form-pending');

export function setFormPending(pending: FormPending): void {
	setContext(KEY, pending);
}

/** Undefined outside a Form. */
export function getFormPending(): FormPending | undefined {
	return getContext<FormPending | undefined>(KEY);
}
