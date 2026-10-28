export type Task = {
	taskId: number;
	task: string;
	description: string;
	urgent: boolean;
	important: boolean;
	/** `YYYY-MM-DD`, or '' when the task has no due date. */
	dueDate: string;
};

export type TaskInput = Omit<Task, 'taskId'>;

export type Quadrant = { urgent: boolean; important: boolean; title: string; hint: string };

/** The Eisenhower matrix, in reading order: important row first, urgent column first. */
export const QUADRANTS: Quadrant[] = [
	{ urgent: true, important: true, title: 'Urgent and important', hint: 'Do it now' },
	{ urgent: false, important: true, title: 'Important, not urgent', hint: 'Plan it' },
	{ urgent: true, important: false, title: 'Urgent, not important', hint: 'Delegate it' },
	{ urgent: false, important: false, title: 'Neither', hint: 'Drop it' }
];

export function inQuadrant(task: Task, quadrant: Quadrant): boolean {
	return task.urgent === quadrant.urgent && task.important === quadrant.important;
}

export function isOverdue(dueDate: string, today: string): boolean {
	return dueDate !== '' && dueDate < today;
}

export function todayIso(now = new Date()): string {
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Reads the `urgent` and `important` fields, each `true` or `false`; null if either is anything else. */
export function parseQuadrant(form: FormData): Pick<Task, 'urgent' | 'important'> | null {
	const flag = (name: string) => {
		const value = form.get(name);
		return value === 'true' ? true : value === 'false' ? false : null;
	};
	const urgent = flag('urgent');
	const important = flag('important');
	return urgent === null || important === null ? null : { urgent, important };
}

/** The quadrant chosen as `quadrant` (`urgent:important`, e.g. `false:true`); undefined if none is. */
export function quadrantChoice(form: FormData): Quadrant | undefined {
	return QUADRANTS.find((q) => form.get('quadrant') === `${q.urgent}:${q.important}`);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type TaskFormErrors = Partial<Record<'task' | 'dueDate', string>>;

export function parseTaskForm(
	form: FormData
): { ok: true; input: TaskInput } | { ok: false; errors: TaskFormErrors } {
	const field = (name: string) => {
		const value = form.get(name);
		return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
	};
	const input: TaskInput = {
		task: field('task'),
		description: field('description'),
		urgent: form.get('urgent') === 'on',
		important: form.get('important') === 'on',
		dueDate: field('dueDate')
	};
	const errors: TaskFormErrors = {};
	if (!input.task) errors.task = 'Name the task.';
	if (input.dueDate && !DATE.test(input.dueDate)) errors.dueDate = 'Use a date like 2026-12-24.';
	return Object.keys(errors).length ? { ok: false, errors } : { ok: true, input };
}
