import { describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ createTask: vi.fn() }));
vi.mock('./store.ts', () => store);

const { makeTaskAction } = await import('./make-task.ts');

function post(values: Record<string, string>) {
	const data = new FormData();
	for (const [name, value] of Object.entries(values)) data.set(name, value);
	const request = new Request('http://localhost/consume?/toTask', { method: 'POST', body: data });
	return makeTaskAction({ request } as Parameters<typeof makeTaskAction>[0]);
}

describe('makeTaskAction', () => {
	it('creates the task in the chosen quadrant, with its due date', async () => {
		store.createTask.mockReset();
		const result = await post({
			task: 'Read: Gardening',
			description: 'Ada\nhttps://example.com/a',
			quadrant: 'true:false',
			dueDate: '2026-11-02'
		});
		expect(result).toEqual({ taskAdded: 'Urgent, not important' });
		expect(store.createTask).toHaveBeenCalledWith({
			task: 'Read: Gardening',
			description: 'Ada\nhttps://example.com/a',
			urgent: true,
			important: false,
			dueDate: '2026-11-02'
		});
	});

	it('creates nothing without a quadrant or a name', async () => {
		store.createTask.mockReset();
		expect(await post({ task: 'Read: Gardening' })).toMatchObject({ status: 400 });
		expect(await post({ task: ' ', quadrant: 'true:true' })).toMatchObject({ status: 400 });
		expect(store.createTask).not.toHaveBeenCalled();
	});
});
