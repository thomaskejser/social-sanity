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
});
