SELECT task_id    AS "taskId",
       task,
       description,
       urgent,
       important,
       due_date   AS "dueDate"
FROM task
ORDER BY due_date = '', due_date, created_at;
