import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RadioGroup from './RadioGroup.svelte';

const options = [
	{ value: 'ftp', label: 'FTP', description: 'Classic FTP.' },
	{ value: 'sftp', label: 'SFTP', description: 'Over SSH.' }
];

describe('RadioGroup', () => {
	it('renders a labelled group with the current value checked', async () => {
		render(RadioGroup, { legend: 'Protocol', name: 'protocol', options, value: 'sftp' });
		await expect.element(page.getByRole('group', { name: 'Protocol' })).toBeVisible();
		await expect.element(page.getByRole('radio', { name: 'SFTP' })).toBeChecked();
		await expect.element(page.getByRole('radio', { name: 'FTP', exact: true })).not.toBeChecked();
	});

	it('keeps descriptions out of the accessible name but linked to the input', async () => {
		render(RadioGroup, { legend: 'Protocol', name: 'protocol', options, value: 'ftp' });
		const ftp = page.getByRole('radio', { name: 'FTP', exact: true });
		await expect.element(ftp).toHaveAccessibleDescription('Classic FTP.');
	});

	it('selects an option when its label is clicked', async () => {
		render(RadioGroup, { legend: 'Protocol', name: 'protocol', options, value: 'ftp' });
		await page.getByText('SFTP', { exact: true }).click();
		await expect.element(page.getByRole('radio', { name: 'SFTP' })).toBeChecked();
	});
});
