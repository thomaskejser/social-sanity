import { fail, type Action } from '@sveltejs/kit';
import { parseTaskForm, quadrantChoice } from '#lib/tasks/task.ts';
import { createTask } from './store.ts';

/**
 * The `toTask` action of a page with a Make a task button: creates the task in the quadrant the
 * user chose, and says which one.
 */
export const makeTaskAction: Action = async ({ request }) => {
	const form = await request.formData();
	const result = parseTaskForm(form);
	if (!result.ok) return fail(400, { error: Object.values(result.errors).join(' ') });
	const quadrant = quadrantChoice(form);
	if (!quadrant) return fail(400, { error: 'Choose how important and urgent it is.' });
	createTask({ ...result.input, urgent: quadrant.urgent, important: quadrant.important });
	return { taskAdded: quadrant.title };
};
