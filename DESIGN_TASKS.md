# Tasks

A simple task based interface to remember things.

Tasks can be ranked on two dimensions:

- Urgent / Not Urgent
- Important / Not Important

Tasks are arranged in a 2x2 grid with these dimensions (the Eisenhover Matrix).

The user can click any of 4 panes to add a task.

From the [consume](./DESIGN_CONSUME.md) interface, a user can click an icon that turns reading the article into a task..

Tasks can be edited by clicking on them.

Tasks can also be dragged between panes to change their urgency and importance.

## Properties of tasks

| Property | Description |
|---|---|
| Urgent | True if the task is urgent |
| Important | True if the task is important |
| Task | The name of the task. Required |
| Description | A longer description of the task, optional |
| Due Date | When the task MUST be completed |


