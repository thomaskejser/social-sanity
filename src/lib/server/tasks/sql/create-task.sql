INSERT INTO task (task_id, task, description, urgent, important, due_date, created_at, updated_at)
VALUES ((SELECT COALESCE(MAX(task_id), 0) + 1 FROM task), $task, $description, $urgent, $important,
        $due_date, $now, $now);
