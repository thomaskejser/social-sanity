import { db, flag } from '../db/index.ts';
import type { Task, TaskInput } from '#lib/tasks/task.ts';
import listSql from './sql/list-tasks.sql?raw';
import createSql from './sql/create-task.sql?raw';
import updateSql from './sql/update-task.sql?raw';
import moveSql from './sql/move-task.sql?raw';
import deleteSql from './sql/delete-task.sql?raw';

const statements = {
	list: db.prepare<[], Omit<Task, 'urgent' | 'important'> & { urgent: number; important: number }>(
		listSql
	),
	create: db.prepare(createSql),
	update: db.prepare(updateSql),
	move: db.prepare(moveSql),
	delete: db.prepare(deleteSql)
};

export function listTasks(): Task[] {
	return statements.list
		.all()
		.map((row) => ({ ...row, urgent: row.urgent === 1, important: row.important === 1 }));
}

function params(input: TaskInput) {
	return {
		task: input.task,
		description: input.description,
		urgent: flag(input.urgent),
		important: flag(input.important),
		due_date: input.dueDate
	};
}

export function createTask(input: TaskInput, now = Date.now()) {
	statements.create.run({ ...params(input), now });
}

export function updateTask(taskId: number, input: TaskInput, now = Date.now()) {
	statements.update.run({ ...params(input), task_id: taskId, now });
}

export function moveTask(taskId: number, urgent: boolean, important: boolean, now = Date.now()) {
	statements.move.run({ task_id: taskId, urgent: flag(urgent), important: flag(important), now });
}

export function deleteTask(taskId: number) {
	statements.delete.run({ task_id: taskId });
}
