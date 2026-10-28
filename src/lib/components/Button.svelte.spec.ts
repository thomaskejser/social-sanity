import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import Button from './Button.svelte';

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Button', () => {
	it('renders a semantic button with its data-action', async () => {
		render(Button, { action: 'destructive', children: label('Delete') });
		const button = page.getByRole('button', { name: 'Delete' });
		await expect.element(button).toHaveAttribute('data-action', 'destructive');
		await expect.element(button).toHaveAttribute('type', 'button');
	});

	it('calls onclick', async () => {
		const onclick = vi.fn();
		render(Button, { onclick, children: label('Go') });
		await page.getByRole('button', { name: 'Go' }).click();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('shows the busy label and is disabled while busy', async () => {
		render(Button, { busy: true, busyLabel: 'Saving…', children: label('Save') });
		const button = page.getByRole('button', { name: 'Saving…' });
		await expect.element(button).toBeDisabled();
		await expect.element(button).toHaveAttribute('aria-busy', 'true');
	});

	it('keeps its text when busy without a busy label', async () => {
		render(Button, { busy: true, children: label('Save') });
		await expect.element(page.getByRole('button', { name: 'Save' })).toBeDisabled();
	});

	it('is enabled and not busy by default, even with a busy label', async () => {
		render(Button, { busyLabel: 'Saving…', children: label('Save') });
		const button = page.getByRole('button', { name: 'Save' });
		await expect.element(button).toBeEnabled();
		await expect.element(button).not.toHaveAttribute('aria-busy');
	});
});
