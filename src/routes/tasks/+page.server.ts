import { fail } from '@sveltejs/kit';
import {
	createTask,
	deleteTask,
	listTasks,
	moveTask,
	updateTask
} from '#lib/server/tasks/store.ts';
import { parseQuadrant, parseTaskForm, todayIso } from '#lib/tasks/task.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ tasks: listTasks(), today: todayIso() });

function taskId(form: FormData): number | undefined {
	const id = Number(form.get('taskId'));
	return Number.isInteger(id) && id > 0 ? id : undefined;
}

export const actions: Actions = {
	saveTask: async ({ request }) => {
		const form = await request.formData();
		const result = parseTaskForm(form);
		if (!result.ok) return fail(400, { taskErrors: result.errors });
		const id = taskId(form);
		if (id) {
			updateTask(id, result.input);
			return { saved: true };
		}
		const quadrant = parseQuadrant(form);
		if (!quadrant) return fail(400, { error: 'Unknown pane.' });
		createTask({ ...result.input, ...quadrant });
		return { saved: true };
	},

	moveTask: async ({ request }) => {
		const form = await request.formData();
		const id = taskId(form);
		if (!id) return fail(400, { error: 'Unknown task.' });
		const quadrant = parseQuadrant(form);
		if (!quadrant) return fail(400, { error: 'Unknown pane.' });
		moveTask(id, quadrant.urgent, quadrant.important);
		return { moved: true };
	},

	deleteTask: async ({ request }) => {
		const id = taskId(await request.formData());
		if (!id) return fail(400, { error: 'Unknown task.' });
		deleteTask(id);
		return { deleted: true };
	}
};
